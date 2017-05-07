"use strict";

var createMathObject = function() {
  var asRadians = Math.PI / 180;
  var asDegrees = 180 / Math.PI;

  function dragRotate(rotationVector, deltaRoll, deltaPitch) {
    var roll = rotationVector[0] * asRadians;
    var pitch = rotationVector[1] * asRadians;
    var yaw = rotationVector[2] * asRadians;
    deltaRoll = deltaRoll * asRadians;
    deltaPitch = deltaPitch * asRadians;
    
    var sinRoll = Math.sin(roll);
    var sinPitch = Math.sin(pitch);
    var sinYaw = Math.sin(yaw);
    var cosRoll = Math.cos(roll);
    var cosPitch = Math.cos(pitch);
    var cosYaw = Math.cos(yaw);

    var sinDeltaRoll = Math.sin(deltaRoll);
    var sinDeltaPitch = Math.sin(deltaPitch);
    var cosDeltaRoll = Math.cos(deltaRoll);
    var cosDeltaPitch = Math.cos(deltaPitch);

    var m00 = -sinDeltaRoll * sinRoll * cosPitch + (sinYaw * sinRoll * sinPitch + cosYaw * cosRoll) * cosDeltaRoll,
        m01 = -sinYaw * cosDeltaRoll * cosPitch - sinDeltaRoll * sinPitch,
        m10 = - sinDeltaPitch * sinRoll * cosDeltaRoll * cosPitch - (sinYaw * sinRoll * sinPitch + cosYaw * cosRoll) * sinDeltaRoll * sinDeltaPitch - (sinRoll * sinPitch * cosYaw - sinYaw * cosRoll) * cosDeltaPitch,
        m11 = sinDeltaRoll * sinDeltaPitch * sinYaw * cosPitch - sinDeltaPitch * sinPitch * cosDeltaRoll + cosDeltaPitch * cosYaw * cosPitch,
        m20 = - sinRoll * cosDeltaRoll * cosDeltaPitch * cosPitch - (sinYaw * sinRoll * sinPitch + cosYaw * cosRoll) * sinDeltaRoll * cosDeltaPitch + (sinRoll * sinPitch * cosYaw - sinYaw * cosRoll) * sinDeltaPitch,
        m21 = sinDeltaRoll * sinYaw * cosDeltaPitch * cosPitch - sinDeltaPitch * cosYaw * cosPitch - sinPitch * cosDeltaRoll * cosDeltaPitch,
        m22 = cosDeltaRoll * cosDeltaPitch * cosRoll * cosPitch + (sinYaw * sinPitch * cosRoll - sinRoll * cosYaw) * sinDeltaRoll * cosDeltaPitch - (sinPitch * cosYaw * cosRoll + sinYaw * sinRoll) * sinDeltaPitch;
           
    var newYaw, newPitch, newRoll;
    if (m01 != 0 || m11 != 0) {
         newYaw = Math.atan2(-m01, m11);
         newPitch = Math.atan2(-m21, Math.sin(newYaw) == 0 ? m11 / Math.cos(newYaw) : - m01 / Math.sin(newYaw));
         newRoll = Math.atan2(-m20, m22);
    } else {
         newYaw = Math.atan2(m10, m00) - m21 * roll;
         newPitch = - m21 * Math.PI / 2;
         newRoll = roll;
    }
    
    return([newRoll * asDegrees, newPitch * asDegrees, newYaw * asDegrees]);
  }

  function dot(v0, v1) {
      for (var i = 0, sum = 0; v0.length > i; ++i) {
        sum += v0[i] * v1[i];
      }
      return sum;
  }

  function convertEulerToQuaternion(eulerAngle) {
      var roll = .5 * eulerAngle[0] * asRadians,
          pitch = .5 * eulerAngle[1] * asRadians,
          yaw = .5 * eulerAngle[2] * asRadians,

          sinRoll = Math.sin(roll),
          cosRoll = Math.cos(roll),
          sinPitch = Math.sin(pitch),
          cosPitch = Math.cos(pitch),
          sinYaw = Math.sin(yaw),
          cosYaw = Math.cos(yaw);

      return [
        cosRoll*cosPitch*cosYaw + sinRoll*sinPitch*sinYaw,
        sinRoll*cosPitch*cosYaw - cosRoll*sinPitch*sinYaw,
        cosRoll*sinPitch*cosYaw + sinRoll*cosPitch*sinYaw,
        cosRoll*cosPitch*sinYaw - sinRoll*sinPitch*cosYaw
      ];
  }

  function trackballAngles(mousePosition) {
    var scale = projection.scale();
    var translation = projection.translate();
    var x = mousePosition[0] - translation[0];
    var y = - (mousePosition[1] - translation[1]);
    var sidesSquared = x*x + y*y;


    var z = scale*scale > 2 * sidesSquared ? Math.sqrt(scale*scale - sidesSquared) : scale*scale / 2 / Math.sqrt(sidesSquared);  

    var lambda = Math.atan2(x, z) * asDegrees; 
    var phi = Math.atan2(y, z) * asDegrees
    return [lambda, phi];
  }

  function convertQuaternionToEuler(quaternion){
    var x = Math.atan2(
      2 * (quaternion[0] * quaternion[1] + quaternion[2] * quaternion[3]),
      1 - 2 * (quaternion[1] * quaternion[1] + quaternion[2] * quaternion[2])
    );

    var yMin = Math.min(1, 2 * (quaternion[0] * quaternion[2] - quaternion[3] * quaternion[1]));
    var y = Math.asin(Math.max(-1, yMin));

    var z = Math.atan2(
      2 * (quaternion[0] * quaternion[3] + quaternion[1] * quaternion[2]),
      1 - 2 * (quaternion[2] * quaternion[2] + quaternion[3] * quaternion[3])
    );

    return [ x * asDegrees, y * asDegrees, z * asDegrees ];
  }

  function slerp(quaternionStart, quaternionEnd, percentChange) {
    var cosHalfTheta = dot(quaternionStart, quaternionEnd);

    if (Math.abs(cosHalfTheta) >= 1.0) {
      return quaternionStart;
    }

    var halfTheta = Math.acos(cosHalfTheta);
    var sinHalfTheta = Math.sqrt(1 - cosHalfTheta * cosHalfTheta);

    if (Math.abs(sinHalfTheta) < 0.001){
      return [
        (quaternionStart[0] * 0.5 + quaternionEnd[0] * 0.5),
        (quaternionStart[1] * 0.5 + quaternionEnd[1] * 0.5),
        (quaternionStart[2] * 0.5 + quaternionEnd[2] * 0.5),
        (quaternionStart[3] * 0.5 + quaternionEnd[3] * 0.5)
      ];
    }

    var ratioA = Math.sin((1-percentChange) * halfTheta) / sinHalfTheta;
    var ratioB = Math.sin(percentChange*halfTheta) / sinHalfTheta;

    var w = quaternionStart[0] * ratioA + quaternionEnd[0] * ratioB;
    var x = quaternionStart[1] * ratioA + quaternionEnd[1] * ratioB;
    var y = quaternionStart[2] * ratioA + quaternionEnd[2] * ratioB;
    var z = quaternionStart[3] * ratioA + quaternionEnd[3] * ratioB;

    return [w,x,y,z];
  }


  function getNewRotationVectorViaSlerp(currentRotation, targetRotation, change) {
    var newQuaternion = slerp(convertEulerToQuaternion(currentRotation), convertEulerToQuaternion(targetRotation), change);
    return convertQuaternionToEuler(newQuaternion);
  }

  return {
    dragRotate: dragRotate,
    getNewRotationVector: getNewRotationVectorViaSlerp,
    trackballAngles: trackballAngles
  }
}

var createMovementObject = function() {
  var initialMousePosition = null;
  var initialRotation;

  function scale() {
    var currentTranslation = d3.event.translate;
    var newTranslation = [];
    var scale = d3.event.scale;
    var quarterHeight = height/8;

    newTranslation[0] = Math.min(
      (width/height)  * (scale - 1), 
      Math.max( width * (1 - scale), currentTranslation[0] )
    );

    newTranslation[1] = Math.min(
      quarterHeight * (scale - 1) + quarterHeight * scale, 
      Math.max(height  * (1 - scale) - quarterHeight * scale, currentTranslation[1])
    );


    zoom.translate(newTranslation);
    g.attr("transform", "translate(" + newTranslation + ")scale(" + scale + ")");

    d3.selectAll("circle").attr("transform", "translate(" + newTranslation + ")scale(" + scale + ")");
    storedZoom = scale;

    d3.selectAll(".country").style("stroke-width", 1.5 / scale);
  }

  function mousemove() {
    if (initialMousePosition) {
      clearInterval(rotateInterval);
      var newMousePosition = globeMath.trackballAngles(d3.mouse(svg[0][0]));
      var newRotation = globeMath.dragRotate(
        initialRotation,
        newMousePosition[0] - initialMousePosition[0],
        newMousePosition[1] - initialMousePosition[1]
      );
      storedRotation = newRotation;
      rotateMap(newRotation);
    }
  }

  function mouseup() {
    if (initialMousePosition) {
      mousemove();
      initialMousePosition = null;
    }
  }

  function mousedown() {  // remember where the mouse was pressed, in canvas coords
    initialMousePosition = globeMath.trackballAngles(d3.mouse(svg[0][0]));
    initialRotation = projection.rotate();
    d3.event.preventDefault();
    locationRoller.cancelDemo();
  }

  function rotateMap(newVector) {
    projection.rotate(newVector);
    svg.selectAll("path").attr("d", path);
  }

  function rotateToLocation(targetRotation) {
    if (displayGlobe) {
      var isWithin = function (number, target, range) {
        return Math.abs(number-target) < range;
      }

      var change = .15;
      var newVector = globeMath.getNewRotationVector(storedRotation, targetRotation, change);

      if (isWithin(newVector[0], targetRotation[0], change) && isWithin(newVector[1], targetRotation[1], change) && isWithin(newVector[2], targetRotation[2], change)) {
        storedRotation = newVector;
        clearInterval(rotateInterval);
        window.requestAnimationFrame(recolorMap);
      }

      rotateMap(newVector);
      storedRotation = newVector;
    } else {
      rotateMap([0,0,0]);
      window.requestAnimationFrame(createNewMap);
    }
  }

  return {
    mousedown: mousedown,
    mouseup: mouseup,
    mousemove: mousemove,
    scale: scale,
    rotateMap: rotateMap,
    rotateToLocation: rotateToLocation
  }
}

function setupProjection(displayGlobe) {
  var newProjection;
  if (displayGlobe) {
    newProjection = d3.geo.orthographic()
        .scale(height/2.5)
        .translate([width / 2, height / 2])
        .clipAngle(90);
  } else {
    newProjection = d3.geo.equirectangular()
      .translate([(width/2), (height/2)])
      .scale( width / 2 / Math.PI);
  }
  return newProjection;
}

function setup(width,height, displayGlobe){
  projection = setupProjection(displayGlobe);

  path = d3.geo.path().projection(projection);
  if (displayGlobe) {
    svg = d3.select("#container").append("svg")
        .attr("fill", "transparent")
        .call(zoom)
        .attr("preserveAspectRatio", "xMinYMin  meet")
        .attr("viewBox", "0 0 " + (width) + " " + (height))
        .attr("width", width)
        .attr("height", height)
        .on("mousedown.zoom", null)
        .on("touchstart.zoom", null)
        .on("touchmove.zoom", null)
        .on("touchend.zoom", null)
        .on("mousedown", movementObject.mousedown)
        .on("touchstart", movementObject.mousedown)
        .on("mousemove", movementObject.mousemove)
        .on("touchmove", movementObject.mousemove)
        .on("touchend", movementObject.mouseup)
        .on("mouseup", movementObject.mouseup);
    svg.append("circle")
       .attr("cx", width/2)
       .attr("cy", height/2)
       .attr("r", height/2.5)
       .attr("stroke", "transparent")
       .attr("fill", "#F0F8FF");
  } else {
    svg = d3.select("#container").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(zoom)
        .on("click", click)
        .append("g");
  }

  g = svg.append("g");

  var world = getCurrentWorld(displayGlobe);
  return topojson.feature(world, world.objects.countries);
}

var colorFillNames = {
  defaultFill: "#ABDDA4",
  nonvisited: "#b4b4b7",
  visited: "#ff0000",
  northamerica: '#0fa0fa',
  southamerica: '#ff0000',
  africa: '#006400',
  europe: '#800080',
  asia: '#ffa500',
  oceania: '#5f9ab7',
  antarctica: '#d3d3d3'
};

var shadeColor = function (color, percent) {   
    var f=parseInt(color.slice(1),16),quaternion=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((quaternion-R)*p)+R)*0x10000+(Math.round((quaternion-G)*p)+G)*0x100+(Math.round((quaternion-B)*p)+B)).toString(16).slice(1);
}

var getColorMap = function() {
    return {
      'ZWE': {fillKey: 'africa'},
      'ZMB': {fillKey: 'africa'},
      'ZAF': {fillKey: 'africa'},
      'UGA': {fillKey: 'africa'},
      'TZA': {fillKey: 'africa'},
      'TUN': {fillKey: 'africa'},
      'TGO': {fillKey: 'africa'},
      'TCD': {fillKey: 'africa'},
      'SWZ': {fillKey: 'africa'},
      'SSD': {fillKey: 'africa'},
      'SOM': {fillKey: 'africa'},
      'somaliland': {fillKey: 'africa'},
      'SLE': {fillKey: 'africa'},
      'SHN': {fillKey: 'africa'},
      'SEN': {fillKey: 'africa'},
      'SDN': {fillKey: 'africa'},
      'RWA': {fillKey: 'africa'},
      'REU': {fillKey: 'africa'},
      'NGA': {fillKey: 'africa'},
      'NER': {fillKey: 'africa'},
      'NAM': {fillKey: 'africa'},
      'MYT': {fillKey: 'africa'},
      'MWI': {fillKey: 'africa'},
      'MUS': {fillKey: 'africa'},
      'MRT': {fillKey: 'africa'},
      'MOZ': {fillKey: 'africa'},
      'MLI': {fillKey: 'africa'},
      'MDG': {fillKey: 'africa'},
      'MAR': {fillKey: 'africa'},
      'LSO': {fillKey: 'africa'},
      'LBY': {fillKey: 'africa'},
      'LBR': {fillKey: 'africa'},
      'KEN': {fillKey: 'africa'},
      'GNQ': {fillKey: 'africa'},
      'GNB': {fillKey: 'africa'},
      'GMB': {fillKey: 'africa'},
      'GIN': {fillKey: 'africa'},
      'GHA': {fillKey: 'africa'},
      'GAB': {fillKey: 'africa'},
      'ETH': {fillKey: 'africa'},
      'ESH': {fillKey: 'africa'},
      'ERI': {fillKey: 'africa'},
      'EGY': {fillKey: 'africa'},
      'DZA': {fillKey: 'africa'},
      'DJI': {fillKey: 'africa'},
      'CPV': {fillKey: 'africa'},
      'COM': {fillKey: 'africa'},
      'COG': {fillKey: 'africa'},
      'COD': {fillKey: 'africa'},
      'CMR': {fillKey: 'africa'},
      'CIV': {fillKey: 'africa'},
      'CAF': {fillKey: 'africa'},
      'BWA': {fillKey: 'africa'},
      'BFA': {fillKey: 'africa'},
      'BEN': {fillKey: 'africa'},
      'BDI': {fillKey: 'africa'},
      'AGO': {fillKey: 'africa'},

      'YEM': {fillKey: 'asia'},
      'VNM': {fillKey: 'asia'},
      'UZB': {fillKey: 'asia'},
      'TWN': {fillKey: 'asia'},
      'TUR': {fillKey: 'asia'},
      'TLS': {fillKey: 'asia'},
      'TKM': {fillKey: 'asia'},
      'TJK': {fillKey: 'asia'},
      'THA': {fillKey: 'asia'},
      'SYR': {fillKey: 'asia'},
      'SYC': {fillKey: 'asia'},
      'SGP': {fillKey: 'asia'},
      'SAU': {fillKey: 'asia'},
      'RUS': {fillKey: 'asia'},
      'QAT': {fillKey: 'asia'},
      'PSE': {fillKey: 'asia'},
      'PRK': {fillKey: 'asia'},
      'PHL': {fillKey: 'asia'},
      'PAK': {fillKey: 'asia'},
      'OMN': {fillKey: 'asia'},
      'NPL': {fillKey: 'asia'},
      'MYS': {fillKey: 'asia'},
      'MNG': {fillKey: 'asia'},
      'MMR': {fillKey: 'asia'},
      'MDV': {fillKey: 'asia'},
      'MAC': {fillKey: 'asia'},
      'LKA': {fillKey: 'asia'},
      'LBN': {fillKey: 'asia'},
      'LAO': {fillKey: 'asia'},
      'KWT': {fillKey: 'asia'},
      'KOR': {fillKey: 'asia'},
      'KHM': {fillKey: 'asia'},
      'KGZ': {fillKey: 'asia'},
      'KAZ': {fillKey: 'asia'},
      'JPN': {fillKey: 'asia'},
      'JOR': {fillKey: 'asia'},
      'ISR': {fillKey: 'asia'},
      'IRQ': {fillKey: 'asia'},
      'IRN': {fillKey: 'asia'},
      'IOT': {fillKey: 'asia'},
      'IND': {fillKey: 'asia'},
      'IDN': {fillKey: 'asia'},
      'HKG': {fillKey: 'asia'},
      'CXR': {fillKey: 'asia'},
      'CHN': {fillKey: 'asia'},
      'CCK': {fillKey: 'asia'},
      'BTN': {fillKey: 'asia'},
      'BRN': {fillKey: 'asia'},
      'BHR': {fillKey: 'asia'},
      'BGD': {fillKey: 'asia'},
      'AZE': {fillKey: 'asia'},
      'ARM': {fillKey: 'asia'},
      'ARE': {fillKey: 'asia'},
      'AFG': {fillKey: 'asia'},

      'GEO': {fillKey: 'asia'},
      'CYP': {fillKey: 'asia'},
      'northern_cyprus': {fillKey: 'asia'},
      
      'VAT': {fillKey: 'europe'},
      'UKR': {fillKey: 'europe'},
      'SWE': {fillKey: 'europe'},
      'SVN': {fillKey: 'europe'},
      'SVK': {fillKey: 'europe'},
      'SRB': {fillKey: 'europe'},
      'SMR': {fillKey: 'europe'},
      'SJM': {fillKey: 'europe'},
      'ROU': {fillKey: 'europe'},
      'PRT': {fillKey: 'europe'},
      'POL': {fillKey: 'europe'},
      'NOR': {fillKey: 'europe'},
      'NLD': {fillKey: 'europe'},
      'MNE': {fillKey: 'europe'},
      'MLT': {fillKey: 'europe'},
      'MKD': {fillKey: 'europe'},
      'MDA': {fillKey: 'europe'},
      'MCO': {fillKey: 'europe'},
      'LVA': {fillKey: 'europe'},
      'LUX': {fillKey: 'europe'},
      'LTU': {fillKey: 'europe'},
      'LIE': {fillKey: 'europe'},
      'JEY': {fillKey: 'europe'},
      'ITA': {fillKey: 'europe'},
      'ISL': {fillKey: 'europe'},
      'IRL': {fillKey: 'europe'},
      'IMN': {fillKey: 'europe'},
      'HUN': {fillKey: 'europe'},
      'HRV': {fillKey: 'europe'},
      'GRC': {fillKey: 'europe'},
      'GIB': {fillKey: 'europe'},
      'GGY': {fillKey: 'europe'},
      'GBR': {fillKey: 'europe'},
      'FRO': {fillKey: 'europe'},
      'FRA': {fillKey: 'europe'},
      'FIN': {fillKey: 'europe'},
      'EST': {fillKey: 'europe'},
      'ESP': {fillKey: 'europe'},
      'DNK': {fillKey: 'europe'},
      'DEU': {fillKey: 'europe'},
      'CZE': {fillKey: 'europe'},
      'ALA': {fillKey: 'europe'},
      'ALB': {fillKey: 'europe'},
      'AND': {fillKey: 'europe'},
      'AUT': {fillKey: 'europe'},
      'BEL': {fillKey: 'europe'},
      'BGR': {fillKey: 'europe'},
      'BIH': {fillKey: 'europe'},
      'BLR': {fillKey: 'europe'},
      'CHE': {fillKey: 'europe'},
      'kosovo': {fillKey: 'europe'},
      'EUR_RUS': {fillKey: 'europe'},

      'USA': {fillKey: 'northamerica' },
      'MEX': {fillKey: 'northamerica' },
      'CAN': {fillKey: 'northamerica' },
      'GTM': {fillKey: 'northamerica' },
      'HND': {fillKey: 'northamerica' },
      'GRL': {fillKey: 'northamerica' },
      'SLV': {fillKey: 'northamerica' },
      'NIC': {fillKey: 'northamerica' },
      'CRI': {fillKey: 'northamerica' },
      'DMA': {fillKey: 'northamerica' },
      'DOM': {fillKey: 'northamerica' },
      'CUB': {fillKey: 'northamerica' },
      'HTI': {fillKey: 'northamerica' },
      'PRI': {fillKey: 'northamerica' },
      'TTO': {fillKey: 'northamerica' },
      'VGB': {fillKey: 'northamerica' },
      'VIR': {fillKey: 'northamerica' },
      'JAM': {fillKey: 'northamerica' },
      'PAN': {fillKey: 'northamerica' },
      'VCT': {fillKey: 'northamerica' },
      'UMI': {fillKey: 'northamerica' },
      'TCA': {fillKey: 'northamerica' },
      'SXM': {fillKey: 'northamerica' },
      'STP': {fillKey: 'northamerica' },
      'SPM': {fillKey: 'northamerica' },
      'MTQ': {fillKey: 'northamerica' },
      'MSR': {fillKey: 'northamerica' },
      'MAF': {fillKey: 'northamerica' },
      'LCA': {fillKey: 'northamerica' },
      'KNA': {fillKey: 'northamerica' },
      'GRD': {fillKey: 'northamerica' },
      'GLP': {fillKey: 'northamerica' },
      'CYM': {fillKey: 'northamerica' },
      'BRB': {fillKey: 'northamerica' },
      'BMU': {fillKey: 'northamerica' },
      'BLZ': {fillKey: 'northamerica' },
      'BLM': {fillKey: 'northamerica' },
      'BHS': {fillKey: 'northamerica' },
      'BES': {fillKey: 'northamerica' },
      'ATG': {fillKey: 'northamerica' },
      'AIA': {fillKey: 'northamerica' },

      'VEN': {fillKey: 'southamerica' },
      'GUY': {fillKey: 'southamerica' },
      'SUR': {fillKey: 'southamerica' },
      'GUF': {fillKey: 'southamerica' },
      'BRA': {fillKey: 'southamerica' },
      'URY': {fillKey: 'southamerica' },
      'PRY': {fillKey: 'southamerica' },
      'PER': {fillKey: 'southamerica' },
      'ABW': {fillKey: 'southamerica' },
      'FLK': {fillKey: 'southamerica' },
      'ECU': {fillKey: 'southamerica' },
      'CUW': {fillKey: 'southamerica' },
      'COL': {fillKey: 'southamerica' },
      'CHL': {fillKey: 'southamerica' },
      'BOL': {fillKey: 'southamerica' },
      'ARG': {fillKey: 'southamerica' },

      'AUS': {fillKey: 'oceania' },
      'NZL': {fillKey: 'oceania' },
      'WSM': {fillKey: 'oceania' },
      'TON': {fillKey: 'oceania' },
      'SLB': {fillKey: 'oceania' },
      'FJI': {fillKey: 'oceania' },
      'VUT': {fillKey: 'oceania' },
      'TUV': {fillKey: 'oceania' },
      'TKL': {fillKey: 'oceania' },
      'PYF': {fillKey: 'oceania' },
      'PNG': {fillKey: 'oceania' },
      'PLW': {fillKey: 'oceania' },
      'PCN': {fillKey: 'oceania' },
      'WLF': {fillKey: 'oceania' },
      'NRU': {fillKey: 'oceania' },
      'NIU': {fillKey: 'oceania' },
      'NFK': {fillKey: 'oceania' },
      'NCL': {fillKey: 'oceania' },
      'MNP': {fillKey: 'oceania' },
      'MHL': {fillKey: 'oceania' },
      'KIR': {fillKey: 'oceania' },
      'GUM': {fillKey: 'oceania' },
      'FSM': {fillKey: 'oceania' },
      'ASM': {fillKey: 'oceania' },
      'ATF': {fillKey: 'oceania' },
      'COK': {fillKey: 'oceania' },

      'ATA': {fillKey: 'antarctica'},
      'BVT': {fillKey: 'antarctica'},
      'SGS': {fillKey: 'antarctica'},
      'HMD': {fillKey: 'antarctica'},
    };
};

function draw(topo, displayGlobe) {
  var country = g.selectAll(".country").data(topo.features);
  var visitedArray = [
    "ATA", "CAN", "AUS", "NZL", "BRA", "ARG", "MAF", "ZWE", "ZAF", "VIR", "VGB", "USA", "TZA", "THA", "BWA", "EGY", "KEN", "MAR", "NAM", "TZA",
    "BHS", "CUB", "HTI", "JAM", "MEX", "CHN", "IND", "IDN", "JPN", "SGP", "THA", "TUR", "ARE", "VNM", "RUS", "PRI", "NLD", "DEU", "ESP", "FRA",
    "GBR", "SWE", "EST", "FIN", "GRC", "HKG", "ITA", "MNE", "HRV", "HUN", "CHE", "AUT", "BEL", 'CZE'
  ];

  country.enter().insert("path")
    .attr("class", function(d) {
      var colorMap = getColorMap();
      var visited = visitedArray.indexOf(d.id) > -1 ? ' visited' : '';
      if (colorMap[d.id]) {
        return "country " + colorMap[d.id].fillKey + visited;
      } else {
        return "country " + visited;
      }
    })
    .attr("d", path)
    .attr("id", function(d,i) { return d.id; })
    .attr("title", function(d,i) { return d.properties.name; })
    .style("fill", function(d, i) {
      try {
        var colorMap = getColorMap();
        if (colorMap[d.id]) {
          if (selectedMapType === 'visited' &&  locationRoller.getSelectedElement && locationRoller.getSelectedElement().toLowerCase().replace(' ', '') === colorMap[d.id].fillKey.toLowerCase()) {
            var color = colorFillNames[colorMap[d.id].fillKey];
            var percentageChange = visitedArray.indexOf(d.id) > -1 ? -.5 : .5;
            return shadeColor(color, percentageChange);
          } else {
            return colorFillNames[colorMap[d.id].fillKey];
          }
        }
      } catch(e) {
        
      }
      return "black"; 
    });

  var offsetL = document.getElementById('container').offsetLeft+20;
  var offsetT = document.getElementById('container').offsetTop+10;

  country.on("mousemove", function(d,i) {
    var mouse = d3.mouse(svg.node()).map(function(d) {
      return parseInt(d);
    });

    d3.select(this).style("cursor", "pointer");

    tooltip.classed("hidden", false)
            .attr("style", "left:"+(mouse[0]+offsetL)+"px;top:"+(mouse[1]+offsetT)+"px")
            .html(function(d) {
              if (d.properties.name) return d.properties.name
              return d.id; 
            }(d));

  }).on("mouseout",  function(d,i) {
    tooltip.classed("hidden", true);
  });
  if (togglingMaps) {
    zoom.translate([0, 0]).scale(storedZoom);
  } else {
    zoom.translate([0, 0]).scale(1);
  }
  var newRotation = [0,0,0];
  if (displayGlobe) {
    newRotation = storedRotation;
  }
  movementObject.rotateMap(newRotation);
  togglingMaps = false;
}

function throttle() {
  window.clearTimeout(throttleTimer);
    throttleTimer = window.setTimeout(function() {
      window.requestAnimationFrame(createNewMap);
    }, 200);
}

function click() {
  var latlon = projection.invert(d3.mouse(this));
}

function createNewMap () {
  var container = document.getElementById('container');
  width = container.offsetWidth;
  height = width / 2;
  d3.select('svg').remove();
  if (displayGlobe) {
    if (height > 600) {
      height = 600;
    }
    container.className = "global-view"; 
  } else {
    container.classList.remove("global-view"); 
  }
  topo = setup(width,height,displayGlobe);
  draw(topo, displayGlobe);
}

function recolorMap() {
  ['northamerica','europe','asia','oceania','antarctica','africa','southamerica'].forEach(function (element) {
    d3.selectAll("." + element).transition().style("fill", colorFillNames[element]);
  });

  if (locationRoller.getSelectedElement && selectedMapType === 'visited') {
    var continentSelected = locationRoller.getSelectedElement().toLowerCase().replace(' ', '');
    d3.selectAll("." + continentSelected).transition().style("fill", shadeColor(colorFillNames[continentSelected], .5));
    d3.selectAll("." + continentSelected + ".visited").transition().style("fill", shadeColor(colorFillNames[continentSelected], -.5));
  }
}

document.addEventListener("DOMContentLoaded", function (event) {
    var orthographicSelector = document.getElementById('orthographic');
    orthographicSelector.addEventListener('change', function (event) {
      displayGlobe = orthographicSelector.checked || false;
      window.requestAnimationFrame(createNewMap);
      togglingMaps = true;
    });

    var visitedSelector = document.getElementById('visited');
    visitedSelector.addEventListener('change', function (event) {
        selectedMapType = visitedSelector.checked ? 'visited' : 'continent';
        window.requestAnimationFrame(recolorMap);
    });
});

function callForNewMap() {
  if (displayGlobe && locationRoller.getSelectedElement) {
    var rotationCoordinates = {
      'europe': [-15.672299334783183, -42.992669189528236, 0.0034898530054431345],
      'northamerica': [101.93038481306967, -42.389726903499984, 9.29878917438975],
      'asia': [-88.76957254392269, -37.36394465849986, -19.01068422558651],
      'antarctica': [21.653867796634064, 89.3139539698907, -34.143665676810556],
      'southamerica': [64.6113636409277, 27.86200051985779, 1.5090438689472683],
      'africa': [-15.44547456275948, -0.6516005548556657, -0],
      'oceania': [-135.78958485165387, 30.194218903527958, 4.349942898316325]
    };
    var rotationChoosen = rotationCoordinates[locationRoller.getSelectedElement().toLowerCase().replace(' ', '')];
    if (rotateInterval) {
      clearInterval(rotateInterval);
    }

    rotateInterval = setInterval(function() {
      movementObject.rotateToLocation(rotationChoosen);
    }, 2);
  } else {
    clearInterval(rotateInterval);
    storedRotation = [0,0,0];
    if (!togglingMaps) {
      window.requestAnimationFrame(recolorMap);
    } else {
      window.requestAnimationFrame(createNewMap);
    }
  }
}

var topo,projection,path,svg,g;
var throttleTimer, rotateInterval;
var displayGlobe = true;
var selectedMapType = 'visited'; // Could be 'continent', 'visited', 'none'

d3.select(window).on("resize", throttle);

var width = document.getElementById('container').offsetWidth;
var height = width / 2;
var tooltip = d3.select("#container").append("div").attr("class", "tooltip hidden");
var movementObject = createMovementObject();
var zoom = d3.behavior.zoom()
      .scaleExtent([1, 9])
      .on("zoom", movementObject.scale);

var globeMath = createMathObject();
topo = setup(width,height, displayGlobe);

var storedRotation = [0,0,0];
var storedZoom = 1;
var togglingMaps = false;

window.requestAnimationFrame(createNewMap);
