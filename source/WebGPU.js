import { mat4, mat3 } from 'gl-matrix';

import { BYTES_PER_FLOAT, FLOATS_PER_MAT4, FLOATS_PER_MAT3 } from './consts.js'

import LocalAxes from './LocalAxes.js';
import VertexFormatLine from './VertexFormatLine.js';
import lineVert from './shaders/line.vert.wgsl';
import lineFrag from './shaders/line.frag.wgsl';

import Background from './Background.js';

export default class WebGPU {
  constructor(canvas) {
    this.canvas = canvas;

    this.pipelines = {};

    this.drawables = [];
    this.id2entity = {};
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

    const vfLine = new VertexFormatLine();
    await this.buildPipeline('line', vfLine, lineVert, lineFrag)

    this.localAxes = new LocalAxes(this, 'line');
  }

  initBackground(pipelineName) {
    this.background = new Background(this, pipelineName);
    this.background.init(this.player.mvpMatrixBuffer);
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

    this.pipelines[name] = {
      pipeline: this.device.createRenderPipeline(pipelineDescriptor),
      vertexFormat
    };
  }

  buildProjViewMatrixBuffer() {
    const projViewMatrixBufferSize = BYTES_PER_FLOAT * FLOATS_PER_MAT4 * 4;

    this.projViewMatrixBuffer = this.device.createBuffer({
      size: projViewMatrixBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const modelMatrix = mat4.fromValues(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
    // const normalMatrix = mat3.normalFromMat4(mat3.create(), modelMatrix);
    const normalMatrix = mat4.transpose(mat4.create(), mat4.invert(mat4.create(), modelMatrix));
    this.device.queue.writeBuffer(this.projViewMatrixBuffer, 4*16, modelMatrix.buffer, modelMatrix.byteOffset, modelMatrix.byteLength);
    this.device.queue.writeBuffer(this.projViewMatrixBuffer, 4*16*2, normalMatrix.buffer, normalMatrix.byteOffset, normalMatrix.byteLength);
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
          loadValue: { r: 0.0, g: 1.0, b: 1.0, a: 1.0 },
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

  addDrawable(drawable) {
    this.drawables.push(drawable);
  }

  addEntity(entity) {
    this.id2entity[entity.id] = entity;
  }

  removeEntity(id) {
    this.id2entity[id].freeGPUMemory();
    delete this.id2entity[id];
  }

  run(startFn, endFn) {
    this.buildRenderPassDescriptor();

    var projView = mat4.create();

    

    const frame = () => {
      startFn();

      this.controls.checkKeyPress();

      mat4.multiply(projView, this.projMatrix, this.player.getViewMatrix());
      this.device.queue.writeBuffer(this.projViewMatrixBuffer, 0, projView.buffer, projView.byteOffset, projView.byteLength);
      this.device.queue.writeBuffer(this.projViewMatrixBuffer, 4*16*3, this.player.position.buffer, this.player.position.byteOffset, this.player.position.byteLength);

      this.renderPassDescriptor.colorAttachments[0].view = this.context.getCurrentTexture().createView();
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);

      if (this.background) {
        this.player.updateMVPMatrixBuffer(projView, this.player.position, this.t, true);
        this.background.draw(passEncoder);
      }

      this.drawables.forEach(drawable => { drawable.draw(passEncoder) });

      Object.values(this.id2entity).forEach(entity => {
        entity.draw(passEncoder, projView, this.player.position);
      });

      passEncoder.endPass();
      this.device.queue.submit([commandEncoder.finish()]);

      this.t++;

      endFn();

      requestAnimationFrame(frame);
    }

    this.t = 0;
    requestAnimationFrame(frame);
  }
}
