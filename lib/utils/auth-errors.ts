const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'Email not confirmed': 'Veuillez confirmer votre adresse email avant de vous connecter.',
  'User already registered': 'Un compte existe déjà avec cette adresse email.',
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
  'Unable to validate email address: invalid format': "L'adresse email n'est pas valide.",
  'Email rate limit exceeded': 'Trop de tentatives. Veuillez patienter quelques minutes.',
  'For security purposes, you can only request this once every 60 seconds':
    "Pour des raisons de sécurité, vous ne pouvez faire cette demande qu'une fois par minute.",
  'Token has expired or is invalid': 'Le code est expiré ou invalide. Veuillez en demander un nouveau.',
  'OTP has expired': 'Le code a expiré. Veuillez en demander un nouveau.',
}

export function getAuthError(message: string): string {
  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (message.includes(key)) return value
  }
  return 'Une erreur est survenue. Veuillez réessayer.'
}
