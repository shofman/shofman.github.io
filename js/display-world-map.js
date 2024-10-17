"use strict";

const createDisplay = (params) => {
  const container = document.getElementById(params.id);
  container.className = "active";
  return {
    container,
    g: null,
    tooltip: d3.select(`#${params.id}`).append("div").attr("class", "tooltip hidden"),
    projection: null,
    path: null,
    zoom: d3
      .zoom()
      .scaleExtent(params.zoom)
      .on("zoom", function zoom() {
        if (worldDisplay.isGlobe) {
          const { k: zoomLevel } = d3.event.transform;
          const center = [worldDisplay.getWidth() / 2, worldDisplay.getHeight() / 2];

          const xOffset = center[0] * (1 - zoomLevel);
          const yOffset = center[1] * (1 - zoomLevel);

          const transform = `translate(${xOffset}, ${yOffset}) scale(${zoomLevel})`;

          worldDisplay.getGraphAttribute().attr("transform", transform);
          d3.selectAll("circle").attr("transform", transform);
          d3.selectAll(".country").style("stroke-width", 1.5 / d3.event.transform.k + "px");
        } else {
          worldDisplay.getGraphAttribute().attr("transform", d3.event.transform);
          d3.selectAll(".country").style("stroke-width", 1.5 / d3.event.transform.k + "px");
        }
      }),
    svg: null,
    width: container.offsetWidth,
    height: container.offsetWidth / 2,
  };
};

function rotateMap(newVector) {
  worldDisplay.getProjection().rotate(newVector);
  worldDisplay.getVisibleSvg().selectAll("path").attr("d", worldDisplay.getPath());
}

const createMovementObject = function () {
  let initialMousePosition = null;
  let initialRotation;

  function mousemove() {
    if (initialMousePosition) {
      const visibleSvg = worldDisplay.getVisibleSvg();
      const mousePos = d3.mouse(visibleSvg["_groups"][0][0]);
      const newMousePosition = globeMath.trackballAngles(mousePos);
      const newRotation = globeMath.dragRotate(
        initialRotation,
        newMousePosition[0] - initialMousePosition[0],
        newMousePosition[1] - initialMousePosition[1]
      );
      rotateMap(newRotation);
    }
  }

  function mouseup() {
    if (initialMousePosition) {
      mousemove();
      initialMousePosition = null;
    }
  }

  function mousedown() {
    const visibleSvg = worldDisplay.getVisibleSvg();
    const mousePos = d3.mouse(visibleSvg["_groups"][0][0]);
    initialMousePosition = globeMath.trackballAngles(mousePos);
    initialRotation = worldDisplay.getProjection().rotate();
    d3.event.preventDefault();
    locationRoller.cancelDemo();
  }

  return {
    mousedown,
    mouseup,
    mousemove,
  };
};

function setupGlobe() {
  worldDisplay.globe.projection = d3
    .geoOrthographic()
    .scale(worldDisplay.globe.height / 2.5)
    .translate([worldDisplay.globe.width / 2, worldDisplay.globe.height / 2])
    .clipAngle(90);
  worldDisplay.globe.path = d3.geoPath().projection(worldDisplay.globe.projection);

  worldDisplay.globe.svg = d3
    .select("#globe-container")
    .append("svg")
    .attr("fill", "transparent")
    .call(worldDisplay.globe.zoom)
    .attr("preserveAspectRatio", "xMinYMin  meet")
    .attr("viewBox", "0 0 " + worldDisplay.globe.width + " " + worldDisplay.globe.height)
    .attr("width", worldDisplay.globe.width)
    .attr("height", worldDisplay.globe.height)
    .on("wheel", function () {
      d3.event.preventDefault();
    })
    .on("mousedown.zoom", null)
    .on("touchstart.zoom", null)
    .on("touchmove.zoom", null)
    .on("touchend.zoom", null)
    .on("mousedown", movementObject.mousedown)
    .on("mousemove", movementObject.mousemove)
    .on("touchend", movementObject.mouseup)
    .on("mouseup", movementObject.mouseup);

  const defs = worldDisplay.globe.svg.append("defs");

  const radialGradient = defs
    .append("radialGradient")
    .attr("id", "radialOcean")
    .attr("cx", "50%")
    .attr("cy", "50%")
    .attr("r", "80%");

  radialGradient
    .append("stop")
    .attr("offset", "20%")
    .attr("stop-color", colorFillNames["lightblue"]) // Light blue
    .attr("stop-opacity", 0.4);

  radialGradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", colorFillNames["midblue"]) // Mid blue
    .attr("stop-opacity", 0.3);

  // Apply the radial gradient as the base fill
  worldDisplay.globe.svg
    .append("circle")
    .attr("cx", worldDisplay.globe.width / 2)
    .attr("cy", worldDisplay.globe.height / 2)
    .attr("r", worldDisplay.globe.height / 2.5)
    .attr("stroke", "transparent")
    .attr("fill", "url(#radialOcean)");

  worldDisplay.globe.g = worldDisplay.globe.svg.append("g");
}

function setupMap() {
  worldDisplay.map.projection = d3
    .geoEquirectangular()
    .translate([worldDisplay.map.width / 2, worldDisplay.map.height / 2])
    .scale(worldDisplay.map.width / 2 / Math.PI);
  worldDisplay.map.path = d3.geoPath().projection(worldDisplay.map.projection);

  worldDisplay.map.svg = d3
    .select("#map-container")
    .append("svg")
    .attr("width", worldDisplay.map.width)
    .attr("height", worldDisplay.map.height)
    .call(worldDisplay.map.zoom);

  worldDisplay.map.g = worldDisplay.map.svg.append("g");
}

function getJson() {
  const world = worldDisplay.isGlobe ? getGlobeJson() : getMapJson();

  return topojson.feature(world, world.objects.countries);
}

const colorFillNames = {
  lightblue: "#7fcdff",
  midblue: "#1da2d8",
  unselected: "#d3d3d3",
  nonvisited: "#919191",
  visited: "#38b551",
};

function draw() {
  const topo = getJson();
  const country = worldDisplay.getGraphAttribute().selectAll(".country").data(topo.features);
  const countryInfo = getCountryInfo();
  const visitedArray = getVisitedCountries();

  country
    .enter()
    .insert("path")
    .attr("class", function (d) {
      const visited = visitedArray.indexOf(d.id) > -1 ? " visited" : "";
      if (countryInfo[d.id]) {
        return "country " + countryInfo[d.id].fillKey + visited;
      } else {
        return "country " + visited;
      }
    })
    .attr("d", worldDisplay.getPath())
    .attr("id", function (d, i) {
      return d.id;
    })
    .attr("title", function (d, i) {
      return d.properties.name;
    })
    .on("mousemove", function (d, i) {
      const offsetL = worldDisplay.getContainer().offsetLeft + 20;
      const offsetT = worldDisplay.getContainer().offsetTop + 10;
      const mouse = d3.mouse(worldDisplay.getVisibleSvg().node()).map(function (d) {
        return parseInt(d);
      });

      d3.select(this).style("cursor", "pointer");
      worldDisplay
        .getTooltip()
        .classed("hidden", false)
        .attr("style", "left:" + (mouse[0] + offsetL) + "px;top:" + (mouse[1] + offsetT) + "px")
        .html(
          (function (d) {
            if (d.properties.name) {
              return d.properties.name;
            }
            return d.id;
          })(d)
        );
    })
    .on("mouseout", function (d, i) {
      worldDisplay.getTooltip().classed("hidden", true);
    })
    .style("fill", function (d, i) {
      return colorFillNames["unselected"];
    });
}

let throttleTimer;
function throttledMapRedraw() {
  window.clearTimeout(throttleTimer);
  throttleTimer = window.setTimeout(function () {
    window.requestAnimationFrame(createNewMap);
  }, 200);
}

function resizeMap(key) {
  worldDisplay[key].width = worldDisplay.getContainer().offsetWidth;
  worldDisplay[key].height = worldDisplay[key].width / 2;
  if (worldDisplay[key].height > 600) {
    worldDisplay[key].height = 600;
  }
}

function createNewMap() {
  resizeMap("globe");
  resizeMap("map");

  d3.selectAll("svg").remove();
  setup();
  callForNewMap();
}

function recolorMap() {
  const listOfContinents = [
    "northamerica",
    "europe",
    "asia",
    "oceania",
    "antarctica",
    "africa",
    "southamerica",
    "caribbean",
  ];
  if (worldDisplay.displayAllContinents) {
    listOfContinents.forEach(function (element) {
      if (worldDisplay.selectedMapType === mapTypes.visited) {
        d3.selectAll("." + element)
          .transition()
          .style("fill", colorFillNames["nonvisited"]);
        d3.selectAll("." + element + ".visited")
          .transition()
          .style("fill", colorFillNames["visited"]);
      } else {
        d3.selectAll("." + element)
          .transition()
          .style("fill", colorFillNames["unselected"]);
      }
    });
  } else {
    listOfContinents.forEach(function (element) {
      d3.selectAll("." + element)
        .transition()
        .style("fill", colorFillNames["unselected"]);
    });

    if (locationRoller.getSelectedElement && worldDisplay.selectedMapType === mapTypes.visited) {
      const continentSelected = locationRoller.getSelectedElement();
      d3.selectAll("." + continentSelected)
        .transition()
        .style("fill", colorFillNames["nonvisited"]);
      d3.selectAll("." + continentSelected + ".visited")
        .transition()
        .style("fill", colorFillNames["visited"]);
    }
  }
}

document.addEventListener("DOMContentLoaded", function (event) {
  const orthographicSelector = document.getElementById("orthographic");
  const visitedSelector = document.getElementById("visited");
  const showAllSelector = document.getElementById("show-all");
  const toggleAllContinentsEnabled = function (disableContinentsButton) {
    showAllSelector.disabled = disableContinentsButton;
  };

  orthographicSelector.addEventListener("change", function (event) {
    worldDisplay.isGlobe = orthographicSelector.checked || false;
    worldDisplay.selectedMapType = visitedSelector.checked ? mapTypes.visited : mapTypes.continent;
    toggleAllContinentsEnabled(worldDisplay.selectedMapType !== mapTypes.visited);

    if (worldDisplay.isGlobe && worldDisplay.displayAllContinents) {
      window.requestAnimationFrame(recolorMap);
    }
    if (worldDisplay.isGlobe) {
      worldDisplay.globe.container.className = "active";
      worldDisplay.map.container.classList.remove("active");
    } else {
      worldDisplay.map.container.className = "active";
      worldDisplay.globe.container.classList.remove("active");
    }

    callForNewMap();
  });

  visitedSelector.addEventListener("change", function (event) {
    worldDisplay.selectedMapType = visitedSelector.checked ? mapTypes.visited : mapTypes.continent;
    toggleAllContinentsEnabled(worldDisplay.selectedMapType !== mapTypes.visited);
    if (worldDisplay.selectedMapType !== mapTypes.visited) {
      worldDisplay.displayAllContinents = false;
      showAllSelector.checked = false;
    }
    window.requestAnimationFrame(recolorMap);
  });

  showAllSelector.addEventListener("change", function (event) {
    worldDisplay.displayAllContinents = showAllSelector.checked || false;
    locationRoller.cancelDemo();
    window.requestAnimationFrame(recolorMap);
  });
});

function callForNewMap() {
  window.requestAnimationFrame(recolorMap);
  if (worldDisplay.isGlobe && locationRoller.getSelectedElement) {
    const rotationChosen = rotationCoordinates[locationRoller.getSelectedElement()];

    d3.transition()
      .duration(isReducedMotion ? 0 : 1000)
      .tween("rotate", function () {
        const r = d3.interpolate(worldDisplay.getProjection().rotate(), rotationChosen);
        return function (t) {
          if (worldDisplay.isGlobe) {
            rotateMap(r(t));
          }
        };
      });
  }
}

const rotationCoordinates = {
  europe: [-15.672299334783183, -42.992669189528236, 0.0034898530054431345],
  northamerica: [101.93038481306967, -42.389726903499984, 9.29878917438975],
  asia: [-88.76957254392269, -37.36394465849986, -19.01068422558651],
  antarctica: [21.653867796634064, 89.3139539698907, -34.143665676810556],
  southamerica: [64.6113636409277, 27.86200051985779, 1.5090438689472683],
  africa: [-15.44547456275948, -0.6516005548556657, -0],
  oceania: [-135.78958485165387, 30.194218903527958, 4.349942898316325],
  caribbean: [75.20983902442727, -12.071642110547781, 17.965465687385763],
};

const mapTypes = {
  visited: 0,
  continent: 1,
};

const movementObject = createMovementObject();
const globeMath = createMathObject();

const worldDisplay = {
  isGlobe: true,
  displayAllContinents: false,
  selectedMapType: mapTypes.visited,
  globe: createDisplay({
    id: "globe-container",
    zoom: [1, 9],
  }),
  map: createDisplay({
    id: "map-container",
    zoom: [1, 50],
  }),

  getContainer: function () {
    return this.isGlobe ? this.globe.container : this.map.container;
  },
  getGraphAttribute: function () {
    return this.isGlobe ? this.globe.g : this.map.g;
  },
  getTooltip: function () {
    return this.isGlobe ? this.globe.tooltip : this.map.tooltip;
  },
  getProjection: function () {
    return this.isGlobe ? this.globe.projection : this.map.projection;
  },
  getPath: function () {
    return this.isGlobe ? this.globe.path : this.map.path;
  },
  getVisibleSvg: function () {
    return this.isGlobe ? this.globe.svg : this.map.svg;
  },
  getWidth: function () {
    return this.isGlobe ? this.globe.width : this.map.width;
  },
  getHeight: function () {
    return this.isGlobe ? this.globe.height : this.map.height;
  },
};

function setup() {
  setupGlobe();
  setupMap();

  // Draw the initial
  draw();
  worldDisplay.isGlobe = !worldDisplay.isGlobe;

  // Draw the other and then reset the view back to the initial
  draw();
  worldDisplay.isGlobe = !worldDisplay.isGlobe;
}

setup();

// Hide the map from initial view (selected globe)
worldDisplay.map.container.classList.remove("active");
d3.select(window).on("resize", throttledMapRedraw);
