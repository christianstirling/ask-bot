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
 * -----
 * 0.) Set up constants
 * 1.) Calculate scale factors for V, DH, and F
 * 2.) Calculate the maximum acceptable force value given the scale factors * RL (reference load)
 * 3.) Calculate acceptable force for 25% percentile of female workers
 * 4.) Check if actual force is acceptable--if so, return postive response
 * 5.) Calculate individual and sum contribution values
 * 6.) Calculate metric contribution percentages
 * 7.) Determine the input variable with the largest MCP value
 * 8.) Arrange array of input values with corresponding MCPs
 * 9.) Return negative response with 7 and 8 included
 * =====
 */

export function determine_most_impactful_input(
  vertical_height,
  horizontal_distance,
  frequency,
  initial_force,
  sustained_force = "",
  action = "push",
) {
  // 0.)
  // Reference load constant
  const RL = 36.9;
  // Coefficient of variation constant
  const CV = 0.214;
  // P-value at the 25th percentile of female workers
  const Z_25TH_PERCENTILE = -0.63;

  // 1.)
  const { V_SF, DH_SF, F_SF } = calculate_scale_factors(
    vertical_height,
    horizontal_distance,
    frequency,
  );

  // 2.)
  const max_acceptable_value = RL * V_SF * DH_SF * F_SF;

  // 3.)
  const acceptable_force =
    max_acceptable_value + Z_25TH_PERCENTILE * max_acceptable_value * CV;

  // 4.)
  if (initial_force <= acceptable_force) {
    return {
      description: `The task meets the criteria for the 25% percentile of female workers; therefore, it is acceptable.`,
      mcpValues: [],
    };
  }

  // 5.)
  const {
    vertical_contribution,
    distance_horizontal_contribution,
    frequency_contribution,
    force_contribution,
    sum_of_contributions,
  } = calculate_contribution_values(V_SF, DH_SF, F_SF, RL, initial_force);

  // 6.)
  const { vertical_mcp, distance_horizontal_mcp, frequency_mcp, force_mcp } =
    calculate_mcp_values(
      vertical_contribution,
      distance_horizontal_contribution,
      frequency_contribution,
      force_contribution,
      sum_of_contributions,
    );

  // 7.)
  const { name, value } = determine_largest_mcp_value(
    vertical_mcp,
    distance_horizontal_mcp,
    frequency_mcp,
    force_mcp,
  );

  // 8.)
  const arrayOfMcpValues = [
    { name: "Hand height", value: round(vertical_mcp, 2) },
    { name: "Distance", value: round(distance_horizontal_mcp, 2) },
    { name: "Frequency", value: round(frequency_mcp, 2) },
    { name: "Initial Force", value: round(force_mcp, 2) },
  ];

  arrayOfMcpValues.sort((a, b) => b.value - a.value);

  // 9.)
  return {
    description: `The task did not meet the criteria for the 25% percentile of female workers; therefore, it is not acceptable. 
    The most impactful task input for this job is ${name} with a metric contribution of ${round(value, 2)}`,
    mcpValues: arrayOfMcpValues,
  };
}
