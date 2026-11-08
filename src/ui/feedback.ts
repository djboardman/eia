export interface FeedbackService {
  error(message: string): void
  confirm(message: string): boolean
}

export const browserFeedback: FeedbackService = {
  error: (message) => window.alert(message),
  confirm: (message) => window.confirm(message),
}
