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

const createMathObject = function () {
  const asRadians = Math.PI / 180;
  const asDegrees = 180 / Math.PI;

  function dragRotate(rotationVector, deltaRoll, deltaPitch) {
    const roll = rotationVector[0] * asRadians;
    const pitch = rotationVector[1] * asRadians;
    const yaw = rotationVector[2] * asRadians;
    const deltaRollRadians = deltaRoll * asRadians;
    const deltaPitchRadians = deltaPitch * asRadians;

    const sinRoll = Math.sin(roll);
    const sinPitch = Math.sin(pitch);
    const sinYaw = Math.sin(yaw);
    const cosRoll = Math.cos(roll);
    const cosPitch = Math.cos(pitch);
    const cosYaw = Math.cos(yaw);

    const sinDeltaRoll = Math.sin(deltaRollRadians);
    const sinDeltaPitch = Math.sin(deltaPitchRadians);
    const cosDeltaRoll = Math.cos(deltaRollRadians);
    const cosDeltaPitch = Math.cos(deltaPitchRadians);

    const m00 =
        -sinDeltaRoll * sinRoll * cosPitch +
        (sinYaw * sinRoll * sinPitch + cosYaw * cosRoll) * cosDeltaRoll,
      m01 = -sinYaw * cosDeltaRoll * cosPitch - sinDeltaRoll * sinPitch,
      m10 =
        -sinDeltaPitch * sinRoll * cosDeltaRoll * cosPitch -
        (sinYaw * sinRoll * sinPitch + cosYaw * cosRoll) * sinDeltaRoll * sinDeltaPitch -
        (sinRoll * sinPitch * cosYaw - sinYaw * cosRoll) * cosDeltaPitch,
      m11 =
        sinDeltaRoll * sinDeltaPitch * sinYaw * cosPitch -
        sinDeltaPitch * sinPitch * cosDeltaRoll +
        cosDeltaPitch * cosYaw * cosPitch,
      m20 =
        -sinRoll * cosDeltaRoll * cosDeltaPitch * cosPitch -
        (sinYaw * sinRoll * sinPitch + cosYaw * cosRoll) * sinDeltaRoll * cosDeltaPitch +
        (sinRoll * sinPitch * cosYaw - sinYaw * cosRoll) * sinDeltaPitch,
      m21 =
        sinDeltaRoll * sinYaw * cosDeltaPitch * cosPitch -
        sinDeltaPitch * cosYaw * cosPitch -
        sinPitch * cosDeltaRoll * cosDeltaPitch,
      m22 =
        cosDeltaRoll * cosDeltaPitch * cosRoll * cosPitch +
        (sinYaw * sinPitch * cosRoll - sinRoll * cosYaw) * sinDeltaRoll * cosDeltaPitch -
        (sinPitch * cosYaw * cosRoll + sinYaw * sinRoll) * sinDeltaPitch;

    let newYaw, newPitch, newRoll;
    if (m01 != 0 || m11 != 0) {
      newYaw = Math.atan2(-m01, m11);
      newPitch = Math.atan2(
        -m21,
        Math.sin(newYaw) == 0 ? m11 / Math.cos(newYaw) : -m01 / Math.sin(newYaw)
      );
      newRoll = Math.atan2(-m20, m22);
    } else {
      newYaw = Math.atan2(m10, m00) - m21 * roll;
      newPitch = (-m21 * Math.PI) / 2;
      newRoll = roll;
    }

    return [newRoll * asDegrees, newPitch * asDegrees, newYaw * asDegrees];
  }

  function dot(v0, v1) {
    for (let i = 0, sum = 0; v0.length > i; ++i) {
      sum += v0[i] * v1[i];
    }
    return sum;
  }

  function convertEulerToQuaternion(eulerAngle) {
    if (typeof eulerAngle === "undefined") {
      eulerAngle = [0, 0, 0];
    }
    const roll = 0.5 * eulerAngle[0] * asRadians,
      pitch = 0.5 * eulerAngle[1] * asRadians,
      yaw = 0.5 * eulerAngle[2] * asRadians,
      sinRoll = Math.sin(roll),
      cosRoll = Math.cos(roll),
      sinPitch = Math.sin(pitch),
      cosPitch = Math.cos(pitch),
      sinYaw = Math.sin(yaw),
      cosYaw = Math.cos(yaw);

    return [
      cosRoll * cosPitch * cosYaw + sinRoll * sinPitch * sinYaw,
      sinRoll * cosPitch * cosYaw - cosRoll * sinPitch * sinYaw,
      cosRoll * sinPitch * cosYaw + sinRoll * cosPitch * sinYaw,
      cosRoll * cosPitch * sinYaw - sinRoll * sinPitch * cosYaw,
    ];
  }

  function trackballAngles(mousePosition) {
    const scale = worldDisplay.getProjection().scale();
    const translation = worldDisplay.getProjection().translate();
    const x = mousePosition[0] - translation[0];
    const y = -(mousePosition[1] - translation[1]);
    const sidesSquared = x * x + y * y;

    const z =
      scale * scale > 2 * sidesSquared
        ? Math.sqrt(scale * scale - sidesSquared)
        : (scale * scale) / 2 / Math.sqrt(sidesSquared);

    const lambda = Math.atan2(x, z) * asDegrees;
    const phi = Math.atan2(y, z) * asDegrees;
    return [lambda, phi];
  }

  function convertQuaternionToEuler(quaternion) {
    const x = Math.atan2(
      2 * (quaternion[0] * quaternion[1] + quaternion[2] * quaternion[3]),
      1 - 2 * (quaternion[1] * quaternion[1] + quaternion[2] * quaternion[2])
    );

    const yMin = Math.min(1, 2 * (quaternion[0] * quaternion[2] - quaternion[3] * quaternion[1]));
    const y = Math.asin(Math.max(-1, yMin));

    const z = Math.atan2(
      2 * (quaternion[0] * quaternion[3] + quaternion[1] * quaternion[2]),
      1 - 2 * (quaternion[2] * quaternion[2] + quaternion[3] * quaternion[3])
    );

    return [x * asDegrees, y * asDegrees, z * asDegrees];
  }

  function slerp(quaternionStart, quaternionEnd, percentChange) {
    const cosHalfTheta = dot(quaternionStart, quaternionEnd);

    if (Math.abs(cosHalfTheta) >= 1.0) {
      return quaternionStart;
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1 - cosHalfTheta * cosHalfTheta);

    if (Math.abs(sinHalfTheta) < 0.001) {
      return [
        quaternionStart[0] * 0.5 + quaternionEnd[0] * 0.5,
        quaternionStart[1] * 0.5 + quaternionEnd[1] * 0.5,
        quaternionStart[2] * 0.5 + quaternionEnd[2] * 0.5,
        quaternionStart[3] * 0.5 + quaternionEnd[3] * 0.5,
      ];
    }

    const ratioA = Math.sin((1 - percentChange) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(percentChange * halfTheta) / sinHalfTheta;

    const w = quaternionStart[0] * ratioA + quaternionEnd[0] * ratioB;
    const x = quaternionStart[1] * ratioA + quaternionEnd[1] * ratioB;
    const y = quaternionStart[2] * ratioA + quaternionEnd[2] * ratioB;
    const z = quaternionStart[3] * ratioA + quaternionEnd[3] * ratioB;

    return [w, x, y, z];
  }

  function getNewRotationVectorViaSlerp(currentRotation, targetRotation, change) {
    const newQuaternion = slerp(
      convertEulerToQuaternion(currentRotation),
      convertEulerToQuaternion(targetRotation),
      change
    );
    return convertQuaternionToEuler(newQuaternion);
  }

  return {
    dragRotate: dragRotate,
    getNewRotationVector: getNewRotationVectorViaSlerp,
    trackballAngles: trackballAngles,
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

  worldDisplay.globe.svg
    .append("circle")
    .attr("cx", worldDisplay.globe.width / 2)
    .attr("cy", worldDisplay.globe.height / 2)
    .attr("r", worldDisplay.globe.height / 2.5)
    .attr("stroke", "transparent")
    .attr("fill", "#F0F8FF");
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
  defaultFill: "#ABDDA4",
  nonvisited: "#b4b4b7",
  visited: "#ff0000",
  northamerica: "#0fa0fa",
  southamerica: "#ff0000",
  africa: "#006400",
  europe: "#800080",
  asia: "#f79104",
  oceania: "#5f9ab7",
  antarctica: "#d3d3d3",
  caribbean: "#000000",
};

const shadeColor = function (color, percent) {
  const f = parseInt(color.slice(1), 16),
    quaternion = percent < 0 ? 0 : 255,
    p = percent < 0 ? percent * -1 : percent,
    R = f >> 16,
    G = (f >> 8) & 0x00ff,
    B = f & 0x0000ff;
  return (
    "#" +
    (
      0x1000000 +
      (Math.round((quaternion - R) * p) + R) * 0x10000 +
      (Math.round((quaternion - G) * p) + G) * 0x100 +
      (Math.round((quaternion - B) * p) + B)
    )
      .toString(16)
      .slice(1)
  );
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
      try {
        if (countryInfo[d.id]) {
          if (
            worldDisplay.selectedMapType === mapTypes.visited &&
            locationRoller.getSelectedElement &&
            locationRoller.getSelectedElement().toLowerCase().replace(" ", "") ===
              countryInfo[d.id].fillKey.toLowerCase()
          ) {
            const color = colorFillNames[countryInfo[d.id].fillKey];
            const percentageChange = visitedArray.indexOf(d.id) > -1 ? -0.5 : 0.5;
            return shadeColor(color, percentageChange);
          } else {
            return colorFillNames[countryInfo[d.id].fillKey];
          }
        }
      } catch (e) {}
      return "black";
    });
}

let throttleTimer;
function throttledMapRedraw() {
  window.clearTimeout(throttleTimer);
  throttleTimer = window.setTimeout(function () {
    window.requestAnimationFrame(createNewMap);
  }, 200);
}

function createNewMap() {
  worldDisplay.globe.width = worldDisplay.getContainer().offsetWidth;
  worldDisplay.globe.height = worldDisplay.globe.width / 2;
  if (worldDisplay.globe.height > 600) {
    worldDisplay.globe.height = 600;
  }

  worldDisplay.map.width = worldDisplay.getContainer().offsetWidth;
  worldDisplay.map.height = worldDisplay.map.width / 2;
  if (worldDisplay.map.height > 600) {
    worldDisplay.map.height = 600;
  }

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
          .style("fill", shadeColor(colorFillNames[element], 0.5));
        d3.selectAll("." + element + ".visited")
          .transition()
          .style("fill", shadeColor(colorFillNames[element], -0.5));
      } else {
        d3.selectAll("." + element)
          .transition()
          .style("fill", colorFillNames[element]);
      }
    });
  } else {
    listOfContinents.forEach(function (element) {
      d3.selectAll("." + element)
        .transition()
        .style("fill", colorFillNames[element]);
    });

    if (locationRoller.getSelectedElement && worldDisplay.selectedMapType === mapTypes.visited) {
      const continentSelected = locationRoller.getSelectedElement().toLowerCase().replace(" ", "");
      d3.selectAll("." + continentSelected)
        .transition()
        .style("fill", shadeColor(colorFillNames[continentSelected], 0.5));
      d3.selectAll("." + continentSelected + ".visited")
        .transition()
        .style("fill", shadeColor(colorFillNames[continentSelected], -0.5));
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
    const rotationChosen =
      rotationCoordinates[locationRoller.getSelectedElement().toLowerCase().replace(" ", "")];

    d3.transition()
      .duration(1000)
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
