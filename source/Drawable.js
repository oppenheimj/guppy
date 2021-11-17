import VertexFormat from './VertexFormat.js';

export default class Drawable {
  constructor(device) {
    this.device = device;
    this.vertexFormat = new VertexFormat();
  }

  setVertexData(vertexData) {
    this.vertexData = vertexData;
    this.vertexCount = vertexData.length / 12;
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

// The confusing thing about Drawable is that it is subclassed either by something like
// Terrain, of which there are many instances, or by Cow, of which there is one instance.