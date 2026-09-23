import L, {Map, LatLngBounds} from "leaflet";
import "leaflet.markercluster";
import EntityConfig from "../../configs/EntityConfig";
import Entity from "../../models/Entity";
import Logger from "../../util/Logger";
import HaMapUtilities from "../../util/HaMapUtilities";
import HaDateRangeService from "../HaDateRangeService";
import HaLinkedEntityService from "../HaLinkedEntityService";
import HaHistoryService from "../HaHistoryService";
import FocusFollowConfig from "../../configs/FocusFollowConfig";


export default class EntitiesRenderService {

  /** @type {[Entity]} */
  entities = [];
  /** @type {[EntityConfig]} */
  entityConfigs = [];
  /** @type {object} */
  hass;
  /** @type {Map} */
  map;
  /** @type {boolean} */
  isDarkMode = false;
  /** @type {HaDateRangeService} */
  dateRangeManager;
  /** @type {HaLinkedEntityService} */
  linkedEntityService;
  /** @type {HaHistoryService} */
  historyService;
  /** @type {FocusFollowConfig} */
  focusFollowConfig;
  /** @type {L.MarkerClusterGroup} */
  markerClusterGroup;
  /** @type {boolean} */
  clusterMarkers;
  /** @type {boolean} */
  isFollowPaused = false;
  /** @type {number|null} */
  _followPauseTimer = null;
  /** @type {boolean} */
  _isAutoFitting = false;

  _lastFocusedPosition = null;
  _focusViewReady = false;

  constructor(map, hass, focusFollowConfig, entityConfigs, linkedEntityService, dateRangeManager, historyService, isDarkMode, clusterMarkers = true, viewConfig = {}) {
    this.viewConfig = viewConfig;
    this.map = map;
    this.hass = hass;
    this.focusFollowConfig = focusFollowConfig;
    this.entityConfigs = entityConfigs;
    this.linkedEntityService = linkedEntityService;
    this.dateRangeManager = dateRangeManager;
    this.historyService = historyService;
    this.isDarkMode = isDarkMode;
    this.clusterMarkers = clusterMarkers;
  }

  setup() {
    // Initialize marker cluster group if clustering is enabled
    Logger.debug("[EntitiesRenderService] Clustering enabled: " + this.clusterMarkers);
    if (this.clusterMarkers) {
      this.markerClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        removeOutsideVisibleBounds: false,
      });
      this.map.addLayer(this.markerClusterGroup);
      Logger.debug("[EntitiesRenderService] Marker cluster group created and added to map");
    }

    this.entities = this.entityConfigs.map((configEntity) => {
      // Attempt to setup entity. Skip on fail, so one bad entity does not affect others.
      try {
        const entity = new Entity(configEntity, this.hass, this.map, this.historyService, this.dateRangeManager, this.linkedEntityService, this.isDarkMode);
        entity.setup(this.markerClusterGroup);
        return entity;
      } catch (e){
        Logger.error("Entity: " + configEntity.id + " skipped due to missing data", e);
        HaMapUtilities.renderWarningOnMap(this.map, "Entity: " + configEntity.id + " could not be loaded. See console for details.");
        return null;
      }
    })
    // Remove skipped entities.
    .filter(v => v);

    if (!this.focusFollowConfig.isNone && this.focusFollowConfig.hasPause) {
      this._setupFollowPauseListeners();
    }
  }

  _setupFollowPauseListeners() {
    this._pauseFollow = () => {
      if (this._isAutoFitting) { return; }
      this.isFollowPaused = true;
      if (this._followPauseTimer) {
        clearTimeout(this._followPauseTimer);
        this._followPauseTimer = null;
      }
    };

    this._scheduleResume = () => {
      if (this._isAutoFitting) { return; }
      if (this._followPauseTimer) {
        clearTimeout(this._followPauseTimer);
      }
      this._followPauseTimer = setTimeout(() => {
        this.isFollowPaused = false;
        this._followPauseTimer = null;
        this.updateInitialView();
      }, this.focusFollowConfig.pauseMilliseconds);
    };

    this.map.on('mousedown', this._pauseFollow);
    this.map.on('dragstart', this._pauseFollow);
    this.map.on('zoomstart', this._pauseFollow);
    this.map.on('mouseup', this._scheduleResume);
    this.map.on('dragend', this._scheduleResume);
    this.map.on('zoomend', this._scheduleResume);
  }

  cleanup() {
    if (this._followPauseTimer) {
      clearTimeout(this._followPauseTimer);
      this._followPauseTimer = null;
    }
    if (this._pauseFollow) {
      this.map.off('mousedown', this._pauseFollow);
      this.map.off('dragstart', this._pauseFollow);
      this.map.off('zoomstart', this._pauseFollow);
    }
    if (this._scheduleResume) {
      this.map.off('mouseup', this._scheduleResume);
      this.map.off('dragend', this._scheduleResume);
      this.map.off('zoomend', this._scheduleResume);
    }
  }

  async render(hass) {
    if (hass) {
      this.hass = hass;
    }
    this.entities.forEach((ent) => {
      // Entity keeps the hass object from setup(); Lovelace replaces hass on
      // every state change, so without this the marker reads a stale snapshot
      // and never moves (#217).
      try {
        if (this.hass) {
          ent.hass = this.hass;
        }
        ent.update(this.markerClusterGroup);
      } catch (e) {
        Logger.error("Entity: " + ent.id + " failed to update", e);
      }
    });
    this.updateInitialView();
  }

  toggleClustering() {
    this.clusterMarkers = !this.clusterMarkers;

    if (this.clusterMarkers) {
      // Enable clustering
      this.markerClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        removeOutsideVisibleBounds: false,
      });
      this.map.addLayer(this.markerClusterGroup);

      // Move all markers to cluster group
      this.entities.forEach((entity) => {
        if (entity.marker && this.map.hasLayer(entity.marker)) {
          this.map.removeLayer(entity.marker);
          this.markerClusterGroup.addLayer(entity.marker);
        }
      });
    } else {
      // Disable clustering
      if (this.markerClusterGroup) {
        this.markerClusterGroup.clearLayers();
        this.map.removeLayer(this.markerClusterGroup);
        this.markerClusterGroup = null;
      }

      // Add all markers directly to map
      this.entities.forEach((entity) => {
        if (entity.marker && !this.map.hasLayer(entity.marker)) {
          entity.marker.addTo(this.map);
        }
      });
    }
  }

  refocusOnMove(force = false) {
    if (force) {
      this._focusViewReady = true;
    }
    if (!this._focusViewReady || (!force && this.isFollowPaused)) {
      return;
    }
    const states = this.hass?.states ?? {};
    const entity = states[this.viewConfig.focusEntity];
    const candidates = [entity, ...(entity?.attributes?.device_trackers ?? []).map(id => states[id])];
    const attributes = candidates.map(candidate => candidate?.attributes).find(attrs =>
      Number.isFinite(attrs?.latitude) && Number.isFinite(attrs?.longitude) &&
      Math.abs(attrs.latitude) <= 90 && Math.abs(attrs.longitude) <= 180);
    if (!attributes) {
      return;
    }
    // Read live coordinates, independently of marker position filtering or history.
    const position = L.latLng(attributes.latitude, attributes.longitude);
    if (!force && this._lastFocusedPosition) {
      const distance = this._lastFocusedPosition.distanceTo(position);
      if (distance === 0 || distance < this.focusFollowConfig.thresholdMeters) {
        return;
      }
    }
    // A synchronous view change keeps our zoom events out of the pause timer,
    // including the no-op case where Leaflet does not emit moveend.
    this._isAutoFitting = true;
    try {
      this.map.setView(position, this.viewConfig.zoom, { animate: false });
      this._lastFocusedPosition = position;
    } finally {
      this._isAutoFitting = false;
    }
  }

  updateInitialView() {
    if(this.focusFollowConfig.isNone) {
      return;
    }
    if(this.isFollowPaused) {
      return;
    }
    if (this.focusFollowConfig.isRefocusOnMove) {
      this.refocusOnMove();
      return;
    }
    const points = this.entities.filter(e => e.config.focusOnFit).map((e) => e.latLng);
    if(points.length === 0) {
      return;
    }
    // If not, get bounds of all markers rendered
    const bounds = (new LatLngBounds(points)).pad(0.1);
    if(this.focusFollowConfig.isContains) {
      if(this.map.getBounds().contains(bounds)) {
        return;
      }
    }
    this._isAutoFitting = true;
    this.map.once('moveend', () => {
      this._isAutoFitting = false;
    });
    this.map.fitBounds(bounds);
    Logger.debug("[EntitiesRenderService.updateInitialView]: Updating bounds to: " + points.join(","));
  }

  setInitialView() {
    const points = this.entities.filter(e => e.config.focusOnFit).map((e) => e.latLng);
    if(points.length === 0) {
      return;
    }
    // If not, get bounds of all markers rendered
    const bounds = (new LatLngBounds(points)).pad(0.1);
    this._isAutoFitting = true;
    this.map.once('moveend', () => {
      this._isAutoFitting = false;
    });
    this.map.fitBounds(bounds);
    Logger.debug("[EntitiesRenderService.setInitialView]: Setting initial view to: " + points.join(","));
  }
}