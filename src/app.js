import { mat4 }  from 'gl-matrix';

import Camera from "./Camera.js";
import Controls from "./Controls.js";
import Player from "./Player.js";
import Thing from "./Thing.js";


import Cube from './Cube.js';

class WebGPU {
  constructor() {
    this.player;
    this.players = [];
  }

  async init() {
    if (navigator.gpu === undefined) {
      alert("WebGPU is not supported/enabled in your browser");
      return;
    }
  
    this.adapter = await navigator.gpu.requestAdapter();
    this.device = await this.adapter.requestDevice();
  
    this.canvas = document.getElementById("webgpu-canvas");
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
  }

  loadDrawables() {
    this.drawables = {'cube': new Cube(this.device)};
    Object.entries(this.drawables).forEach(([name, drawable]) => drawable.buildVertexBuffer());
  }

  initPlayer() {
    this.camera = new Camera(50, 0.01, 1000);
    this.camera.setWidthHeight(this.canvas.width, this.canvas.height);
    this.projMatrix = this.camera.getProjectionMatrix();

    this.player = new Player();
    this.controls = new Controls(document, this.canvas, this.player);
  }

  initThings() {
    const thing1 = new Thing();
    const thing2 = new Thing();

    thing1.setDrawable(this.drawables['cube']);
    thing2.setDrawable(this.drawables['cube']);

    this.things = [thing1, thing2];

    this.things.forEach(thing => thing.buildModelBuffer());
  }

  buildUniformBindGroup() {
    const uniformBufferSize = 4 * 16; // 4x4 matrix
    this.uniformBuffer = this.device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    this.uniformBindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {buffer: this.uniformBuffer}
        }
      ]
    });
  }

  buildRenderPassDescriptor() {
    var depthTexture = this.device.createTexture({
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
        depthStoreOp: 'clear', // 'store'
        stencilLoadValue: 0,
        stencilStoreOp: 'store',
      }
    };
  }

  run() {
    var projView = mat4.create();

    const frame = () => {
      controls.checkKeyPress();

      mat4.mul(projView, projMatrix, entity.getViewMatrix());
      this.device.queue.writeBuffer(this.uniformBuffer, 0, projView.buffer, projView.byteOffset, projView.byteLength);

      this.renderPassDescriptor.colorAttachments[0].view = this.context.getCurrentTexture().createView();
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);
      passEncoder.setPipeline(this.pipeline);
      passEncoder.setBindGroup(0, this.uniformBindGroup);
      passEncoder.setVertexBuffer(0, this.verticesBuffer);
      passEncoder.draw(cubeVertexCount, 1, 0, 0);
      passEncoder.endPass();
      this.device.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }
}

(async () => {
  const webgpu = new WebGPU();
  await webgpu.init();
  webgpu.loadDrawables();
  webgpu.initPlayer();
  webgpu.initObjects();

  // entity.buildModelBuffer();
  // entity.updateModelBuffer();
  // await drawable.configurePipeline(presentationFormat);

  // Load meshes onto gpu
  // A drawable has a mesh and a view matrix
  // mesh is associated with a particular render pipeline
  // Need a mesh, a model matrix, and a pipeline
  // Something that is drawable knows about its buffers

  // webgpu.buildVertexBuffer();
  await webgpu.configurePipeline();
  webgpu.buildUniformBindGroup();
  webgpu.buildRenderPassDescriptor();
  webgpu.run();
})();
