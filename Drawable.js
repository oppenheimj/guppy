import VertexFormat from './VertexFormat.js';

export default class Drawable {
  constructor(device, vertexCount) {
    this.device = device;
    this.vertexFormat = new VertexFormat();
    this.vertexCount = vertexCount;
  }

  buildVertexBuffer() {
    // Create a vertex buffer from the cube data.
    this.vertexBuffer = this.device.createBuffer({
      size: this.vertexCount * this.vertexFormat.vertexSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
  
    // getMappedRange(offset, size) can also be used
    new Float32Array(this.vertexBuffer.getMappedRange()).set(this.vertexData);
    this.vertexBuffer.unmap();
  }
}
