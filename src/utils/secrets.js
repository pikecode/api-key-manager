function maskToken(token) {
  if (!token || typeof token !== 'string') {
    return token;
  }

  const value = token.trim();
  if (value.length < 10) {
    return '***';
  }

  return value.substring(0, 8) + '***' + value.substring(value.length - 4);
}

function maybeMaskToken(token, showToken = false) {
  if (!token) {
    return token;
  }
  return showToken ? token : maskToken(token);
}

module.exports = { maskToken, maybeMaskToken };

