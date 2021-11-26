export default class Drawable {
  constructor(device, vertexFormat) {
    this.device = device;
    this.vertexFormat = vertexFormat;
  }

  setVertexData(vertexData, vertexCount) {
    this.vertexData = vertexData;
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

  updateVertexBuffer(data) {
    this.device.queue.writeBuffer(this.vertexBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
  }
}

// The confusing thing about Drawable is that it is subclassed either by something like
// Terrain, of which there are many instances, or by Cow, of which there is one instance.