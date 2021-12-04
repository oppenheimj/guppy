export default class Drawable {
  constructor(webgpu, pipelineName) {
    this.webgpu = webgpu;
    this.device = webgpu.device;

    this.pipeline = webgpu.pipelines[pipelineName].pipeline;
    this.vertexFormat = webgpu.pipelines[pipelineName].vertexFormat;

    this.bindGroup = this.buildMVPMatrixBufferBindGroup(webgpu.projViewMatrixBuffer);
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

  buildMVPMatrixBufferBindGroup(mvpMatrixBuffer) {
    return this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {buffer: mvpMatrixBuffer}
        }
      ]
    });
  }

  draw(passEncoder, bindGroup) {
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, bindGroup || this.bindGroup);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.draw(this.vertexCount, 1, 0, 0);
  }

  freeGPUMemory() {
    this.vertexBuffer.destroy();
  }
}
