import { mat4 } from 'gl-matrix';

export default class WebGPU {
  constructor(canvas) {
    this.canvas = canvas;
    this.drawables = [];
    this.entities = [];
    this.name2Pipeline = {};
    this.name2MVPBG = {};
  }

  async init(camera) {
    if (navigator.gpu === undefined) {
      alert("WebGPU is not supported/enabled in your browser");
      return;
    }

    this.adapter = await navigator.gpu.requestAdapter();
    this.device = await this.adapter.requestDevice();

    this.context = this.canvas.getContext("webgpu");
  
    // This returns a string that is "bgra8unorm"
    // https://www.w3.org/TR/webgpu/#texture-formats
    // blue green red alpha unsigned normalized
    this.presentationFormat = this.context.getPreferredFormat(this.adapter);
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.presentationSize = [
      this.canvas.clientWidth * devicePixelRatio,
      this.canvas.clientHeight * devicePixelRatio,
    ];
  
    this.context.configure({
      device: this.device,
      format: this.presentationFormat,
      size: this.presentationSize,
    });

    this.camera = camera;
    this.projMatrix = this.camera.getProjectionMatrix();
    this.buildProjViewMatrixBuffer();
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

  async buildPipeline(name, vertexFormat, vertexShaderCode, fragmentShaderCode) {
    const vertexShader = this.device.createShaderModule({ code: vertexShaderCode });
    await this.checkShaderError(vertexShader);

    const fragmentShader = this.device.createShaderModule({ code: fragmentShaderCode });
    await this.checkShaderError(fragmentShader);

    // So this pipeline is specific to a particular vertex format and pair of shaders.
    // Its saying, lets render vertices represented in this particular way
    // using these particular shaders

    const pipelineDescriptor = {
      vertex: {
        module: vertexShader,
        entryPoint: 'main',
        buffers: [
          {
            stepMode: 'vertex', // or instance!!!
            arrayStride: vertexFormat.vertexSize,
            attributes: vertexFormat.vertexBuffers
          }
        ]
      },
      fragment: {
        module: fragmentShader,
        entryPoint: 'main',
        // This format should match the one configured on the canvas
        targets: [{format: this.presentationFormat}]
      },
      primitive: vertexFormat.primitive,
      // Enable depth testing so that the fragment closest to the camera
      // is rendered in front.
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    }

    this.name2Pipeline[name] = this.device.createRenderPipeline(pipelineDescriptor);
    this.name2MVPBG[name] = this.buildProjViewMatrixBufferBindGroup(this.name2Pipeline[name]);
  }

  buildProjViewMatrixBuffer() {
    const projViewMatrixBufferSize = 4 * 16; // 4x4 matrix

    this.projViewMatrixBuffer = this.device.createBuffer({
      size: projViewMatrixBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
  }

  buildProjViewMatrixBufferBindGroup(pipeline) {
    return this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {buffer: this.projViewMatrixBuffer}
        }
      ]
    });
  }

  buildRenderPassDescriptor() {
    const depthTexture = this.device.createTexture({
      size: this.presentationSize,
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.renderPassDescriptor = {
      colorAttachments: [
        {
          view: undefined, // Assigned later
          loadValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthLoadValue: 1.0,
        depthStoreOp: 'discard', // 'store'
        stencilLoadValue: 0,
        stencilStoreOp: 'store',
      }
    };
  }

  addDrawable(drawable) {
    this.drawables.push(drawable);
  }

  addEntity(entity) {
    this.entities.push(entity);
    Object.entries(this.name2Pipeline).forEach(([name, pipeline]) => {
      entity.buildMVPMatrixBufferBindGroup(pipeline, name);
    })
  }

  run() {
    this.buildRenderPassDescriptor();

    var projView = mat4.create();

    const frame = () => {
      this.controls.checkKeyPress();

      mat4.multiply(projView, this.projMatrix, this.player.getViewMatrix());
      this.device.queue.writeBuffer(this.projViewMatrixBuffer, 0, projView.buffer, projView.byteOffset, projView.byteLength);

      this.renderPassDescriptor.colorAttachments[0].view = this.context.getCurrentTexture().createView();
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);

      // mesh, pipeline, vertexformat, bind groups, e.g. mvp matrix

      // Draw terrain
      this.drawables.forEach(drawable => {
        // update mvp matrix. This model matrix should be identity
        passEncoder.setPipeline(this.name2Pipeline[drawable.pipeline]);
        passEncoder.setBindGroup(0, this.name2MVPBG[drawable.pipeline]);
        passEncoder.setVertexBuffer(0, drawable.vertexBuffer);
        passEncoder.draw(drawable.vertexCount, 1, 0, 0);
      });

      // Draw meshes and local axes
      this.entities.forEach(entity => {
        entity.updateMVPMatrixBuffer(projView);
        entity.updateLocalAxes();

        // draw vertices
        passEncoder.setPipeline(this.name2Pipeline[entity.skin.pipeline]);
        passEncoder.setBindGroup(0, entity.name2MVPBG['flat']);
        passEncoder.setVertexBuffer(0, entity.skin.vertexBuffer);
        passEncoder.draw(entity.skin.vertexCount, 1, 0, 0);

        // draw local axes
        passEncoder.setPipeline(this.name2Pipeline[entity.localAxes.pipeline]);
        passEncoder.setBindGroup(0, entity.name2MVPBG['line']);
        passEncoder.setVertexBuffer(0, entity.localAxes.vertexBuffer);
        passEncoder.draw(entity.localAxes.vertexCount, 1, 0, 0);
      });

      passEncoder.endPass();
      this.device.queue.submit([commandEncoder.finish()]);
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }
}
