import { mat3, mat4, vec4, vec3 } from 'gl-matrix';
import { BYTES_PER_FLOAT, FLOATS_PER_MAT4 } from './consts.js'
import LocalAxes from './LocalAxes.js';
import VertexFormatLine from './VertexFormatLine.js';

const toRadians = degrees => degrees * Math.PI / 180.0;

export default class Entity {
  constructor(device, position, right, up, forward) {
    this.device = device;
    this.pipeline = 'line';

    this.position = position || vec3.fromValues(0, 0, 10);
    this.right = right || vec3.fromValues(1, 0, 0);
    this.up = up || vec3.fromValues(0, 1, 0);
    this.forward = forward || vec3.fromValues(0, 0, -1);

    this.buildMVPMatrixBuffer();
    this.initializeLocalAxes();

    this.name2MVPBG = {};
  }

  getModelMatrix() {
    let f = this.forward;
    let r = this.right;
    let u = this.up;

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
    const mvpMatrixBufferSize = BYTES_PER_FLOAT * FLOATS_PER_MAT4;

    this.mvpMatrixBuffer = this.device.createBuffer({
      size: mvpMatrixBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
  }

  updateMVPMatrixBuffer(projView) {
    const mvp = mat4.multiply(mat4.create(), projView, this.getModelMatrix());
    this.device.queue.writeBuffer(this.mvpMatrixBuffer, 0, mvp.buffer, mvp.byteOffset, mvp.byteLength);
  }

  buildMVPMatrixBufferBindGroup(pipeline, name) {
    this.name2MVPBG[name] = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {buffer: this.mvpMatrixBuffer}
        }
      ]
    });
  }

  initializeLocalAxes() {
    this.localAxes = new LocalAxes(this.device, new VertexFormatLine());
    this.localAxes.setVertexData(this.getLocalAxes(), 6);
    this.localAxes.buildVertexBuffer();
  }

  updateLocalAxes() {
    this.localAxes.updateVertexBuffer(this.getLocalAxes());
  }

  getLocalAxes() {
    return new Float32Array([
      ...[0, 0, 0, 1],
      ...[1, 0, 0, 1],
      ...this.forward,
      ...[1, 0, 0, 1],

      ...[0, 0, 0, 1],
      ...[0, 1, 0, 1],
      ...this.up,
      ...[0, 1, 0, 1],

      ...[0, 0, 0, 1],
      ...[0, 0, 1, 1],
      ...this.right,
      ...[0, 0, 1, 1]
    ]);
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
