import Drawable from './Drawable.js';

export default class Background extends Drawable {
  constructor(webgpu, pipelineName) {
    super(webgpu, pipelineName);
    this.name = 'background';
  }

  init(mvpMatrixBuffer) {
    const camera = this.webgpu.camera;
    const depth = -5000;

    var height = camera.tanFovDiv2 * depth * 2;
    var width = camera.aspect * height;

    height /= 2;
    width /= 2;

    const vertexData = new Float32Array([
      -width, -height, depth, 1,
      width, -height, depth, 1,
      width, height, depth, 1,
      -width, -height, depth, 1,
      width, height, depth, 1,
      -width, height, depth, 1
    ]);
  
    this.setVertexData(vertexData, 6);
    this.buildVertexBuffer();

    this.bindGroup = this.buildMVPMatrixBufferBindGroup(mvpMatrixBuffer);

  }
}