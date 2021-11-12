import VertexFormat from './VertexFormat.js';
import Player from './Player.js'
import Controls from './Controls.js';

import { mat4 } from 'gl-matrix';

export default class WebGPU {
  constructor(canvas) {
    this.canvas = canvas;
    this.geometry = [];
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

    this.vertexFormat = new VertexFormat();
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

  async buildPipeline(vertexShaderCode, fragmentShaderCode) {
    // needs vertex shader, fragment shader, vertexFormat, and presentationSize
    // doesn't need to be an instance method

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
            arrayStride: this.vertexFormat.vertexSize,
            attributes: this.vertexFormat.vertexBuffers
          }
        ]
      },
      fragment: {
        module: fragmentShader,
        entryPoint: 'main',
        // This format should match the one configured on the canvas
        targets: [{format: this.presentationFormat}]
      },
      primitive: {
        // Meaning each set of three vertices are one triangle; no vertices
        // are shared between triangles. If we were doing indexed, then during
        // the draw phase we'd do setIndexBuffer(buffer, type) and drawIndexed(length)
        topology: 'triangle-list', // can also be triangle-strip
        cullMode: 'front',
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
        depthStoreOp: 'store', // 'store'
        stencilLoadValue: 0,
        stencilStoreOp: 'store',
      }
    };
  }

  addGeometry(g) {
    this.geometry.push(g);
  }

  run() {
    var projView = mat4.create();

    const frame = () => {
      this.controls.checkKeyPress();

      mat4.mul(projView, this.projMatrix, this.player.getViewMatrix());
      this.device.queue.writeBuffer(this.player.modelBuffer, 0, projView.buffer, projView.byteOffset, projView.byteLength);

      this.renderPassDescriptor.colorAttachments[0].view = this.context.getCurrentTexture().createView();

      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);

      passEncoder.setPipeline(this.pipeline);
      passEncoder.setBindGroup(0, this.player.modelBindGroup);

      this.geometry.forEach(g => {
        passEncoder.setVertexBuffer(0, g.vertexBuffer);
        passEncoder.draw(g.vertexCount, 1, 0, 0);
      })
      passEncoder.endPass();

      this.device.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }
}