export function continueChallenge(navigation, route, score = 0) {
  const challenge = route?.params?.challenge;
  if (!challenge) {
    navigation.goBack();
    return;
  }

  const scores = { ...(challenge.scores || {}), [challenge.current]: score };
  const sequence = challenge.sequence || [];
  const index = sequence.indexOf(challenge.current);
  const next = sequence[index + 1];

  if (!next) {
    navigation.replace('CognitivePower', { challengeResult: scores });
    return;
  }

  navigation.replace(next, {
    challenge: { ...challenge, current: next, scores },
  });
}
