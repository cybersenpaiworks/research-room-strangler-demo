const scriptedMoments = [
  'Participant pauses when the annual commitment appears on screen.',
  'Participant asks whether procurement approval is needed above the pilot budget.',
  'Participant leans in once onboarding support is mentioned.',
  'Participant pushes back on the seat minimum for the first rollout.',
  'Participant asks for proof that the analytics team will adopt the workflow quickly.',
];

export const buildDemoEventMessage = (eventCount: number): string => {
  const sequence = eventCount + 1;
  const moment = scriptedMoments[eventCount % scriptedMoments.length];

  return `Moment ${sequence}: ${moment}`;
};
