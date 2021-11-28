import { mat3, mat4, vec4, vec3 } from 'gl-matrix';
import { BYTES_PER_FLOAT, FLOATS_PER_MAT4, FLOATS_PER_MAT3 } from './consts.js'

const toRadians = degrees => degrees * Math.PI / 180.0;

export default class Entity {
  constructor(webgpu, position, right, up, forward) {
    this.webgpu = webgpu;
    this.device = webgpu.device;

    this.position = position  || vec3.fromValues(0, 0, 10);
    this.right = right        || vec3.fromValues(1, 0, 0);
    this.up = up              || vec3.fromValues(0, 1, 0);
    this.forward = forward    || vec3.fromValues(0, 0, -1);

    this.buildMVPMatrixBuffer();

    this.localAxes = webgpu.localAxes;
    this.localAxesBindGroup = this.localAxes.buildMVPMatrixBufferBindGroup(this.mvpMatrixBuffer);
  }

  getModelMatrix() {
    const customRotation = (d) => {
      const rotationMatrix = mat4.fromRotation(mat4.create(), d.radians, this[d.axisOfRotation]);
      mat3.fromMat4(rotationMatrix, rotationMatrix);

      return vec3.transformMat3(vec3.create(), this[d.vectorToRotate], rotationMatrix);
    };

    const c = this.skin.customInit;

    let f = c && c.f ? customRotation(c.f) : this.forward;
    let r = c && c.r ? customRotation(c.r) : this.right;
    let u = c && c.u ? customRotation(c.u) : this.up;

    let p = this.position;

    return mat4.fromValues(
      r[0],  r[1],   r[2],   0,
      u[0],  u[1],   u[2],   0,
      f[0],  f[1],   f[2],   0,
      p[0],  p[1],   p[2],   1
    );
  }

  rotationMatrix() {
    let f = this.forward;
    let r = this.right;
    let u = this.up;

    return mat4.fromValues(
      r[0],  u[0],   f[0],   0,
      r[1],  u[1],   f[1],   0,
      r[2],  u[2],   f[2],   0,
      0,     0,      0,      1
    );
  }

  translationMatrix() {
    let p = this.position;

    return mat4.fromValues(
      1,      0,      0,      0,
      0,      1,      0,      0,
      0,      0,      1,      0, 
      -p[0],  -p[1],  -p[2],  1
    );
  }

  getViewMatrix() {
    return mat4.multiply(mat4.create(), this.rotationMatrix(), this.translationMatrix());
  }

  buildMVPMatrixBuffer() {
    const mvpMatrixBufferSize = BYTES_PER_FLOAT * FLOATS_PER_MAT4 * 3;

    this.mvpMatrixBuffer = this.device.createBuffer({
      size: mvpMatrixBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
  }

  updateMVPMatrixBuffer(projView) {
    const modelMatrix = this.getModelMatrix();
    // const normalMatrix = mat3.normalFromMat4(mat3.create(), modelMatrix); // "the transpose of the inverse of the upper-left 3x3 of the model matrix"
    const normalMatrix = mat4.transpose(mat4.create(), mat4.invert(mat4.create(), modelMatrix));
    
    const mvp = mat4.multiply(mat4.create(), projView, modelMatrix);
    this.device.queue.writeBuffer(this.mvpMatrixBuffer, 0, mvp.buffer, mvp.byteOffset, mvp.byteLength);
    this.device.queue.writeBuffer(this.mvpMatrixBuffer, 4*16, modelMatrix.buffer, modelMatrix.byteOffset, modelMatrix.byteLength);

    // This is actually a mat3!! Doesn't need as much space!
    this.device.queue.writeBuffer(this.mvpMatrixBuffer, 4*16*2, normalMatrix.buffer, normalMatrix.byteOffset, normalMatrix.byteLength);
  }

  setSkin(drawable) {
    this.skin = drawable;
    this.skinBindGroup = this.skin.buildMVPMatrixBufferBindGroup(this.mvpMatrixBuffer);
  }

  draw(passEncoder, projView) {
    this.updateMVPMatrixBuffer(projView);

    if (this.skin) {
      this.skin.draw(passEncoder, this.skinBindGroup);
    }

    this.localAxes.draw(passEncoder, this.localAxesBindGroup);
  }
  
  moveAlongVector(dir) {
    vec3.add(this.position, this.position, dir);
  }

  moveForwardLocal(amt) {
    vec3.add(this.position, this.position, vec3.scale(vec3.create(), this.forward, amt));
  }

  moveRightLocal(amt) {
    vec3.add(this.position, this.position, vec3.scale(vec3.create(), this.right, amt));
  }

  moveUpLocal(amt) {
    vec3.add(this.position, this.position, vec3.scale(vec3.create(), this.up, amt));
  }

  moveForwardGlobal(amt) {
    vec3.add(this.position, this.position, vec3.fromValues(0, 0, amt));
  }

  moveRightGlobal(amt) {
    vec3.add(this.position, this.position, vec3.fromValues(amt, 0, 0));
  }

  moveUpGlobal(amt) {
    vec3.add(this.position, this.position, vec3.fromValues(0, amt, 0));
  }

  rotateOnForwardLocal(deg) {
    let rad = toRadians(deg);

    let rotationMatrix = mat4.fromRotation(mat4.create(), rad, this.forward);
    mat3.fromMat4(rotationMatrix, rotationMatrix);

    vec3.transformMat3(this.right, this.right, rotationMatrix);    
    vec3.transformMat3(this.up, this.up, rotationMatrix);
  }

  rotateOnRightLocal(deg) {
    let rad = toRadians(deg);

    let rotationMatrix = mat4.fromRotation(mat4.create(), rad, this.right);
    mat3.fromMat4(rotationMatrix, rotationMatrix);

    vec3.transformMat3(this.forward, this.forward, rotationMatrix);    
    vec3.transformMat3(this.up, this.up, rotationMatrix);
  }

  rotateOnUpLocal(deg) {
    let rad = toRadians(deg);

    let rotationMatrix = mat4.fromRotation(mat4.create(), rad, this.up);
    mat3.fromMat4(rotationMatrix, rotationMatrix);

    vec3.transformMat3(this.forward, this.forward, rotationMatrix);    
    vec3.transformMat3(this.right, this.right, rotationMatrix);
  }

  rotateOnForwardGlobal(deg) {
    let rad = toRadians(deg);

    let rotationMatrix = mat4.fromRotation(mat4.create(), rad, vec4.fromValues(0, 0, 1, 0));
    mat3.fromMat4(rotationMatrix, rotationMatrix);

    vec3.transformMat3(this.forward, this.forward, rotationMatrix);    
    vec3.transformMat3(this.right, this.right, rotationMatrix);
    vec3.transformMat3(this.up, this.up, rotationMatrix);
  }

  rotateOnRightGlobal(deg) {
    let rad = toRadians(deg);

    let rotationMatrix = mat4.fromRotation(mat4.create(), rad, vec4.fromValues(1, 0, 0, 0));
    mat3.fromMat4(rotationMatrix, rotationMatrix);

    vec3.transformMat3(this.forward, this.forward, rotationMatrix);    
    vec3.transformMat3(this.right, this.right, rotationMatrix);
    vec3.transformMat3(this.up, this.up, rotationMatrix);
  }

  rotateOnUpGlobal(deg) {
    let rad = toRadians(deg);

    let rotationMatrix = mat4.fromRotation(mat4.create(), rad, vec4.fromValues(0, 1, 0, 0));
    mat3.fromMat4(rotationMatrix, rotationMatrix);

    vec3.transformMat3(this.forward, this.forward, rotationMatrix);    
    vec3.transformMat3(this.right, this.right, rotationMatrix);
    vec3.transformMat3(this.up, this.up, rotationMatrix);
  }
}
