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

  return {
    dragRotate: dragRotate,
    trackballAngles: trackballAngles,
  };
};
