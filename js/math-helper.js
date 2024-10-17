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
