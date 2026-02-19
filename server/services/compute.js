// server/tools/determine_most_impactful_input.js

function round(number, decimal) {
  const factor = Math.pow(10, decimal);
  return Math.round(number * factor) / factor;
}

function calculate_contribution_values(V_SF, DH_SF, F_SF, RL, force) {
  const vertical_contribution = 1 - V_SF;
  const distance_horizontal_contribution = 1 - DH_SF;
  const frequency_contribution = 1 - F_SF;
  const force_contribution = force - RL > 0 ? (force - RL) / RL : 0;
  // console.log(force_contribution)

  const sum_of_contributions =
    vertical_contribution +
    distance_horizontal_contribution +
    frequency_contribution +
    force_contribution;

  return {
    vertical_contribution,
    distance_horizontal_contribution,
    frequency_contribution,
    force_contribution,
    sum_of_contributions,
  };
}

function calculate_mcp_values(
  vertical_contribution,
  distance_horizontal_contribution,
  frequency_contribution,
  force_contribution,
  sum_of_contributions,
) {
  const vertical_mcp = vertical_contribution / sum_of_contributions;
  const distance_horizontal_mcp =
    distance_horizontal_contribution / sum_of_contributions;
  const frequency_mcp = frequency_contribution / sum_of_contributions;
  const force_mcp = force_contribution / sum_of_contributions;

  return { vertical_mcp, distance_horizontal_mcp, frequency_mcp, force_mcp };
}

function calculate_scale_factors(V, DH, F) {
  const V_SF = -0.5304 + V / 0.3361 - V ** 2 / 0.6915;
  const DH_SF = 1.0286 - DH / 72.22 + DH ** 2 / 9782;
  const F_SF = 0.7251 - Math.log(F) / 13.19 - Math.log(F) ** 2 / 197.3;

  return { V_SF, DH_SF, F_SF };
}

function determine_largest_mcp_value(height, distance, frequency, force) {
  let name;
  let value;

  if (height >= distance && height >= frequency && height >= force) {
    name = "height";
    value = height;
  } else if (distance >= frequency && distance >= force) {
    name = "distance";
    value = distance;
  } else if (frequency >= force) {
    name = "frequency";
    value = frequency;
  } else {
    name = "force";
    value = force;
  }
  return { name: name, value: value };
}

/**
 * =====
 * Main export function
 * =====
 */

export function determine_most_impactful_input(
  handHeight,
  distance,
  frequency,
  initialForce,
  sustainedForce,
  action = "push",
) {
  const RL = 36.9;
  // const CV = 0.214;
  // const Z_25TH_PERCENTILE = -0.63;

  const { V_SF, DH_SF, F_SF } = calculate_scale_factors(
    handHeight,
    distance,
    frequency,
  );

  // const max_acceptible_value = RL * V * DH * F;

  // const acceptible_force =
  //   max_acceptible_value + Z_25TH_PERCENTILE * max_acceptible_value * CV;

  const {
    vertical_contribution,
    distance_horizontal_contribution,
    frequency_contribution,
    force_contribution,
    sum_of_contributions,
  } = calculate_contribution_values(V_SF, DH_SF, F_SF, RL, initialForce);

  const { vertical_mcp, distance_horizontal_mcp, frequency_mcp, force_mcp } =
    calculate_mcp_values(
      vertical_contribution,
      distance_horizontal_contribution,
      frequency_contribution,
      force_contribution,
      sum_of_contributions,
    );

  const { name, value } = determine_largest_mcp_value(
    vertical_mcp,
    distance_horizontal_mcp,
    frequency_mcp,
    force_mcp,
  );

  const RESULT = {
    name: name,
    value: value,
    description: `The most impactful task input for this job is ${name} with a metric contribution of ${round(
      value,
      2,
    )}.`,
  };

  return RESULT;
}
