import basicVertWGSL from './shaders/basic.vert.wgsl';
import vertexPositionColorWGSL from './shaders/vertexPositionColor.frag.wgsl';

export default class Drawable {
  constructor(device) {
    this.device = device;
  }

  buildVertexBuffer() {
    // Create a vertex buffer from the cube data.
    this.vertexBuffer = this.device.createBuffer({
      size: this.vertexArray.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
  
    // getMappedRange(offset, size) can also be used
    new Float32Array(this.vertexBuffer.getMappedRange()).set(this.vertexArray);
    this.vertexBuffer.unmap();
  }

  async checkShaderError(shader) {
    // This API is only available in Chrome right now
    if (shader.compilationInfo) {
      var compilationInfo = await shader.compilationInfo();

      if (compilationInfo.messages.length > 0) {
        var hadError = false;
        console.log("Shader compilation log:");

        for (var i = 0; i < compilationInfo.messages.length; ++i) {
          var msg = compilationInfo.messages[i];
          console.log(`${msg.lineNum}:${msg.linePos} - ${msg.message}`);
          hadError = hadError || msg.type == "error";
        }

        if (hadError) {
          console.log("Shader failed to compile");
          return;
        }
      }
    }
  }

  async configurePipeline(presentationFormat) {
    const vertexShader = this.device.createShaderModule({code: basicVertWGSL});
    await this.checkShaderError(vertexShader);

    const fragmentShader = this.device.createShaderModule({code: vertexPositionColorWGSL});
    await this.checkShaderError(fragmentShader);

    // So this pipeline is specific to a particular vertex format and pair of shaders.
    // Its saying, lets render vertices represented in this particular way
    // using these particular shaders

    const vertexBuffersDescriptor = [
      {
        stepMode: 'vertex', // or instance!!!
        arrayStride: this.vertexSize,
        attributes: [
          {
            shaderLocation: 0,
            offset: this.positionOffset,
            format: 'float32x4'
          },
          {
            shaderLocation: 1,
            offset: this.colorOffset,
            format: 'float32x4'
          },
          {
            shaderLocation: 2,
            offset: this.normalOffset,
            format: 'float32x4'
          },
          {
            shaderLocation: 3,
            offset: this.uvOffset,
            format: 'float32x2'
          }
        ]
      }
    ]

    const pipelineDescriptor = {
      vertex: {
        module: vertexShader,
        entryPoint: 'main',
        buffers: vertexBuffersDescriptor
      },
      fragment: {
        module: fragmentShader,
        entryPoint: 'main',
        // This format should match the one configured on the canvas
        targets: [{format: presentationFormat}]
      },
      primitive: {
        // Meaning each set of three vertices are one triangle; no vertices
        // are shared between triangles. If we were doing indexed, then during
        // the draw phase we'd do setIndexBuffer(buffer, type) and drawIndexed(length)
        topology: 'triangle-list', // can also be triangle-strip
        cullMode: 'back',
      },
      // Enable depth testing so that the fragment closest to the camera
      // is rendered in front.
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    }

    this.pipeline = this.device.createRenderPipeline(pipelineDescriptor);
  }
}
