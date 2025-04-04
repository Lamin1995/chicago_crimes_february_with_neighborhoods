// script.js - Refactored to follow SOLID principles

// Configuration object - centralizes configuration settings for easy modification
const CONFIG = {
  // Data sources
  files: {
    neighborhoods: "neighborhoods.geojson",
    crimes: "crimes_february_with_neighborhoods.geojson",
  },
  // Property fields
  fields: {
    neighborhoodName: "PRI_NEIGH",
  },
  // Map setup
  map: {
    width: 960,
    height: 800,
    padding: 0.05, // 5% padding
    initialZoom: 1.2,
    minZoom: 0.5,
    maxZoom: 8,
  },
  // Graph parameters
  knn: {
    k: 5,
    linkOpacity: 0.4,
    linkWidth: 0.8,
  },
  // Visual settings
  visual: {
    colorScheme: d3.schemeOrRd[5],
    emptyColor: "#f8f9fa",
    breakpoints: [0.15, 0.35, 0.6, 1], // Relative to max crime count
  },
  // Legend settings
  legend: {
    width: 200,
    height: 30,
    margin: { top: 20, left: 20 },
    padding: 10,
  },
};

// Main Application Controller
class ChicagoCrimeVisualizer {
  constructor(config) {
    this.config = config;
    this.data = {
      neighborhoods: null,
      crimes: null,
      crimeCounts: {},
      centroids: [],
      knnLinks: [],
    };
    this.components = {};
    this.scales = {};

    // Initialize the application
    this.init();
  }

  // Initialize the application
  init() {
    // Create SVG container
    this.svg = d3
      .select("#map")
      .attr("width", this.config.map.width)
      .attr("height", this.config.map.height)
      .attr("viewBox", `0 0 ${this.config.map.width} ${this.config.map.height}`)
      .attr("style", "max-width: 100%; height: auto;");

    // Create main group for map elements (for zoom/pan)
    this.mapGroup = this.svg.append("g");

    // Initialize tooltip
    this.tooltip = d3.select("#tooltip");

    // Load data
    this.loadData();
  }

  // Load all required data files
  loadData() {
    Promise.all([
      d3.json(this.config.files.neighborhoods),
      d3.json(this.config.files.crimes),
    ])
      .then(([neighborhoodData, crimeData]) => {
        console.log("Data loaded successfully");

        // Validate data structure
        if (!this.validateData(neighborhoodData, crimeData)) {
          return;
        }

        // Store and process data
        this.data.neighborhoods = neighborhoodData;
        this.data.crimes = crimeData;

        // Process data
        this.processData();

        // Initialize visualization components
        this.initComponents();

        // Render visualization
        this.render();
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        this.showError("Error loading data. Check console and file paths.");
      });
  }

  // Validate data structure
  validateData(neighborhoodData, crimeData) {
    if (!neighborhoodData || !neighborhoodData.features) {
      console.error(
        "Neighborhood GeoJSON structure is invalid or file is empty."
      );
      this.showError("Invalid neighborhood data structure");
      return false;
    }

    if (!crimeData || !crimeData.features) {
      console.error("Crime GeoJSON structure is invalid or file is empty.");
      this.showError("Invalid crime data structure");
      return false;
    }

    return true;
  }

  // Process the loaded data
  processData() {
    // Filter valid neighborhoods
    this.validNeighborhoods = this.data.neighborhoods.features.filter(
      (feature) => feature.properties[this.config.fields.neighborhoodName]
    );

    // Calculate crime counts per neighborhood
    this.processCrimeCounts();

    // Calculate color scale
    this.createColorScale();

    // Calculate map projection
    this.createProjection();

    // Calculate neighborhood centroids and KNN
    this.calculateCentroids();
    this.calculateKNN();
  }

  // Calculate crime counts per neighborhood
  processCrimeCounts() {
    // Initialize counts to 0
    this.validNeighborhoods.forEach((feature) => {
      const name = feature.properties[this.config.fields.neighborhoodName];
      this.data.crimeCounts[name] = 0;
    });

    // Count crimes per neighborhood
    this.data.crimes.features.forEach((crime) => {
      const neighborhoodName =
        crime.properties[this.config.fields.neighborhoodName];
      if (
        neighborhoodName &&
        this.data.crimeCounts.hasOwnProperty(neighborhoodName)
      ) {
        this.data.crimeCounts[neighborhoodName]++;
      }
    });

    console.log("Crime counts calculated:", this.data.crimeCounts);
  }

  // Create color scale based on crime counts
  createColorScale() {
    // Get all crime counts
    const allCounts = Object.values(this.data.crimeCounts);
    this.maxCrimeCount = d3.max(allCounts) || 1;

    // Create custom breaks based on percentage of max
    this.breaks = [1];
    this.config.visual.breakpoints.forEach((bp) => {
      this.breaks.push(Math.ceil(this.maxCrimeCount * bp));
    });
    this.breaks.push(this.maxCrimeCount);

    // Create threshold color scale
    this.scales.color = d3
      .scaleThreshold()
      .domain(this.breaks.slice(1, -1)) // Middle break points
      .range(this.config.visual.colorScheme);
  }

  // Create map projection
  createProjection() {
    this.projection = d3
      .geoMercator()
      .fitSize(
        [
          this.config.map.width * (1 - this.config.map.padding),
          this.config.map.height * (1 - this.config.map.padding),
        ],
        this.data.neighborhoods
      );

    this.pathGenerator = d3.geoPath().projection(this.projection);
  }

  // Calculate centroids for each neighborhood
  calculateCentroids() {
    this.data.centroids = this.validNeighborhoods
      .map((feature) => {
        const centroid = this.pathGenerator.centroid(feature);
        return {
          name: feature.properties[this.config.fields.neighborhoodName],
          coords: centroid,
          feature: feature,
        };
      })
      .filter((d) => !isNaN(d.coords[0]) && !isNaN(d.coords[1]));

    console.log(`Calculated ${this.data.centroids.length} valid centroids`);
  }

  // Calculate K Nearest Neighbors for each centroid
  calculateKNN() {
    // Distance function
    const distance = (p1, p2) =>
      Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));

    // Build KNN graph
    this.data.centroids.forEach((center1, i) => {
      // Calculate and sort distances to all other centroids
      const distances = this.data.centroids
        .map((center2, j) => ({
          index: j,
          dist: i === j ? Infinity : distance(center1.coords, center2.coords),
        }))
        .sort((a, b) => a.dist - b.dist);

      // Take top K neighbors
      for (let k = 0; k < this.config.knn.k && k < distances.length; k++) {
        const neighbor = this.data.centroids[distances[k].index];

        // Avoid duplicate links
        const exists = this.data.knnLinks.some(
          (link) =>
            (link.source === center1 && link.target === neighbor) ||
            (link.source === neighbor && link.target === center1)
        );

        if (!exists) {
          this.data.knnLinks.push({ source: center1, target: neighbor });
        }
      }
    });

    console.log(`Calculated ${this.data.knnLinks.length} KNN links`);
  }

  // Initialize visualization components
  initComponents() {
    this.components = {
      neighborhoods: new NeighborhoodLayer(this),
      knnLinks: new KNNLinkLayer(this),
      centroids: new CentroidLayer(this),
      legend: new LegendComponent(this),
      zoom: new ZoomComponent(this),
    };
  }

  // Render all visualization components
  render() {
    // Render all components
    Object.values(this.components).forEach((component) => {
      if (typeof component.render === "function") {
        component.render();
      }
    });
  }

  // Show error message
  showError(message) {
    this.svg
      .append("text")
      .attr("x", this.config.map.width / 2)
      .attr("y", this.config.map.height / 2)
      .attr("text-anchor", "middle")
      .attr("class", "error-message")
      .text(message);
  }
}

// Neighborhood Layer Component
class NeighborhoodLayer {
  constructor(visualizer) {
    this.visualizer = visualizer;
    this.config = visualizer.config;
    this.data = visualizer.data;
    this.container = visualizer.mapGroup;
    this.tooltip = visualizer.tooltip;
  }

  render() {
    this.container
      .selectAll(".neighborhood")
      .data(this.visualizer.validNeighborhoods)
      .join("path")
      .attr("class", "neighborhood")
      .attr("d", this.visualizer.pathGenerator)
      .attr("fill", (d) => this.getFillColor(d))
      .on("mouseover", (event, d) => this.handleMouseOver(event, d))
      .on("mouseout", (event, d) => this.handleMouseOut(event, d));
  }

  getFillColor(d) {
    const name = d.properties[this.config.fields.neighborhoodName];
    const count = this.data.crimeCounts[name] || 0;
    return count > 0
      ? this.visualizer.scales.color(count)
      : this.config.visual.emptyColor;
  }

  handleMouseOver(event, d) {
    d3.select(event.currentTarget)
      .raise()
      .transition()
      .duration(150)
      .style("stroke-width", "1.5px")
      .style("stroke", "#333")
      .style("filter", "brightness(0.9)");

    const name = d.properties[this.config.fields.neighborhoodName] || "N/A";
    const count = this.data.crimeCounts[name] || 0;

    this.tooltip.transition().duration(200).style("opacity", 0.9);

    this.tooltip
      .html(`<strong>${name}</strong><br/>Crimes: ${count}`)
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY - 20 + "px");
  }

  handleMouseOut(event, d) {
    d3.select(event.currentTarget)
      .transition()
      .duration(150)
      .style("stroke-width", "0.5px")
      .style("stroke", "#aaa")
      .style("filter", "none");

    this.tooltip.transition().duration(500).style("opacity", 0);
  }
}

// KNN Link Layer Component
class KNNLinkLayer {
  constructor(visualizer) {
    this.visualizer = visualizer;
    this.config = visualizer.config;
    this.data = visualizer.data;
    this.container = visualizer.mapGroup;
  }

  render() {
    this.container
      .selectAll(".knn-link")
      .data(this.data.knnLinks)
      .join("line")
      .attr("class", "knn-link")
      .attr("x1", (d) => d.source.coords[0])
      .attr("y1", (d) => d.source.coords[1])
      .attr("x2", (d) => d.target.coords[0])
      .attr("y2", (d) => d.target.coords[1])
      .style("stroke-width", this.config.knn.linkWidth)
      .style("stroke-opacity", this.config.knn.linkOpacity);
  }
}

// Centroid Layer Component
class CentroidLayer {
  constructor(visualizer) {
    this.visualizer = visualizer;
    this.config = visualizer.config;
    this.data = visualizer.data;
    this.container = visualizer.mapGroup;
  }

  render() {
    this.container
      .selectAll(".centroid")
      .data(this.data.centroids)
      .join("circle")
      .attr("class", "centroid")
      .attr("cx", (d) => d.coords[0])
      .attr("cy", (d) => d.coords[1])
      .attr("r", 2.5);
  }
}

// Legend Component
class LegendComponent {
  constructor(visualizer) {
    this.visualizer = visualizer;
    this.config = visualizer.config.legend;
    this.data = visualizer.data;
    this.container = visualizer.svg;
    this.colorScheme = visualizer.config.visual.colorScheme;
    this.breaks = visualizer.breaks;
  }

  render() {
    // Add legend background
    this.container
      .append("rect")
      .attr("class", "legend-background")
      .attr("x", this.config.margin.left - this.config.padding)
      .attr("y", this.config.margin.top - this.config.padding)
      .attr("width", this.config.width + this.config.padding * 2)
      .attr("height", this.config.height + 30)
      .attr("rx", 4)
      .attr("ry", 4);

    // Create legend group
    const legend = this.container
      .append("g")
      .attr("class", "legend")
      .attr(
        "transform",
        `translate(${this.config.margin.left}, ${this.config.margin.top})`
      );

    // Add legend title
    legend
      .append("text")
      .attr("class", "legend-title")
      .attr("x", this.config.width / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .text("CRIME COUNT");

    // Add color rectangles
    legend
      .selectAll("rect")
      .data(this.colorScheme)
      .join("rect")
      .attr("x", (d, i) => (this.config.width / this.colorScheme.length) * i)
      .attr("y", 0)
      .attr("width", this.config.width / this.colorScheme.length)
      .attr("height", this.config.height)
      .attr("fill", (d) => d);

    // Add labels for each threshold
    this.breaks.forEach((breakValue, i) => {
      legend
        .append("text")
        .attr("class", "legend-label")
        .attr("x", (this.config.width / this.colorScheme.length) * i)
        .attr("y", this.config.height + 15)
        .attr("text-anchor", "middle")
        .text(breakValue);
    });
  }
}

// Zoom Component
class ZoomComponent {
  constructor(visualizer) {
    this.visualizer = visualizer;
    this.config = visualizer.config.map;
    this.svg = visualizer.svg;
    this.mapGroup = visualizer.mapGroup;
  }

  render() {
    const zoom = d3
      .zoom()
      .scaleExtent([this.config.minZoom, this.config.maxZoom])
      .on("zoom", (event) => {
        this.mapGroup.attr("transform", event.transform);
      });

    this.svg.call(zoom);

    // Set initial transform
    const initialTransform = d3.zoomIdentity.scale(this.config.initialZoom);
    this.svg.call(zoom.transform, initialTransform);
  }
}

// Initialize the application when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new ChicagoCrimeVisualizer(CONFIG);
});
