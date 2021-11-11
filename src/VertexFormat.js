const BYTES_PER_FLOAT = 4;

export default class VertexFormat {
  constructor() {
    this.vertexSize = 12 * BYTES_PER_FLOAT;

    this.positionOffset = 0;
    this.colorOffset = 4 * BYTES_PER_FLOAT;
    this.normalOffset = 8 * BYTES_PER_FLOAT;

    this.vertexCount = 36;
  }
}