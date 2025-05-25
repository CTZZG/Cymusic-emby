export class MusicError extends Error {
	constructor(
		message: string,
		public code: string,
		public details?: any,
	) {
		super(message)
		this.name = 'MusicError'
	}
}

export class NetworkError extends MusicError {
	constructor(message: string, details?: any) {
		super(message, 'NETWORK_ERROR', details)
		this.name = 'NetworkError'
	}
}

export class APIError extends MusicError {
	constructor(message: string, details?: any) {
		super(message, 'API_ERROR', details)
		this.name = 'APIError'
	}
}
