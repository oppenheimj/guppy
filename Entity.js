import { mat3, mat4, vec4, vec3 } from 'gl-matrix';

const toRadians = degrees => degrees * Math.PI / 180.0;

export default class Entity {
  constructor(device, position, right, up, forward) {
    this.device = device;

    this.position = position || vec3.fromValues(0, 0, 10);
    this.right = right || vec3.fromValues(1, 0, 0);
    this.up = up || vec3.fromValues(0, 1, 0);
    this.forward = forward || vec3.fromValues(0, 0, -1);
  }

  rotationMatrix() {
    let f = this.forward;
    let r = this.right;
    let u = this.up;

    return mat4.transpose(mat4.create(), mat4.fromValues(
      r[0],  r[1],   r[2],   0,
      u[0],  u[1],   u[2],   0,
      f[0],  f[1],   f[2],   0,
      0,     0,      0,      1
    ));
  }

  translationMatrix() {
    let p = this.position;

    return mat4.transpose(mat4.create(), mat4.fromValues(
      1, 0,  0,  -p[0],
      0, 1,  0,  -p[1],
      0, 0,  1,  -p[2], 
      0, 0,  0,  1
    ));
  }

  getViewMatrix() {
    return mat4.multiply(mat4.create(), this.rotationMatrix(), this.translationMatrix());
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

  buildModelBuffer() {
    const modelBufferSize = 4 * 16; // 4x4 matrix
    this.modelBuffer = this.device.createBuffer({
      size: modelBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
  }

  buildModelBufferBindGroup(pipeline) {
    this.modelBindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {buffer: this.modelBuffer}
        }
      ]
    });
  }

  updateModelBuffer() {
    // may need to switch to mapped first
    new Float32Array(this.modelBuffer.getMappedRange()).set(this.getModelMatrix());
    this.modelBuffer.unmap();
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
