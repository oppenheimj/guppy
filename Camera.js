import { mat4 } from "gl-matrix";

export default class Camera {
  constructor(fovY, nearClip, farClip, aspect) {
    this.fovY = fovY;
    this.nearClip = nearClip;
    this.farClip = farClip;
    this.aspect = aspect;
  }

  getProjectionMatrix() {
    const toRadians = degrees => degrees * Math.PI / 180.0;

    let S = 1 / Math.tan(toRadians(this.fovY) / 2);
    let A = this.aspect;

    let P = this.farClip / (this.farClip - this.nearClip);
    let Q = -this.farClip * this.nearClip / (this.farClip - this.nearClip);

    return mat4.transpose(mat4.create(), mat4.fromValues(
      S/A,   0,  0,  0,
      0,     S,  0,  0,
      0,     0,  P,  Q,
      0,     0,  1,  0
    ));
  }
}