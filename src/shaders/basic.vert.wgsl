// Things in [[]] are metadata annotations

[[block]] struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>;
};
[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;

// position is special because GPU internally uses this to draw in clip space.
// This is required to be a vec4<f32>.
struct VertexOutput {
  [[builtin(position)]] Position : vec4<f32>;
  [[location(0)]] color: vec4<f32>;
};


// [[location(x)]] corresponds to shaderLocation inside vertexDescriptor
[[stage(vertex)]]
fn main([[location(0)]] position : vec4<f32>,
        [[location(1)]] color : vec4<f32>,
        [[location(2)]] normal : vec4<f32>) -> VertexOutput {

  var output : VertexOutput;
  output.Position = uniforms.modelViewProjectionMatrix * position;
  output.color = color;

  return output;
}
