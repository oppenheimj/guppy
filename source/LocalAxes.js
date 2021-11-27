import Drawable from './Drawable.js';

export default class LocalAxes extends Drawable {
  constructor(webgpu, pipelineName) {
    super(webgpu, pipelineName);

    const s = 10;
    const vertexData = new Float32Array([
      0, 0, 0, 1,
      1, 0, 0, 1,
      0, 0, -s, 1, // forward
      1, 0, 0, 1,
      0, 0, 0, 1,
      0, 1, 0, 1,
      0, s, 0, 1, // up
      0, 1, 0, 1,
      0, 0, 0, 1,
      0, 0, 1, 1,
      s, 0, 0, 1, // right
      0, 0, 1, 1
    ]);

    this.setVertexData(vertexData, 6);
    this.buildVertexBuffer();
  }
}
