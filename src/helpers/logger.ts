import { createStore, useStore } from 'zustand'

type LogLevel = 'INFO' | 'WARN' | 'ERROR'

type LogEntry = {
	timestamp: string
	level: LogLevel
	message: string
	details?: any[]
}

interface LoggerState {
	logs: LogEntry[]
	addLog: (level: LogLevel, ...args: any[]) => void
	clearLogs: () => void
}

const stringifyArg = (arg: any): string => {
	if (typeof arg === 'string') return arg
	try {
		return JSON.stringify(arg, null, 2)
	} catch (error) {
		return `[Unstringifiable Object]: ${Object.prototype.toString.call(arg)}`
	}
}

export const useLogger = createStore<LoggerState>((set) => ({
	logs: [],
	addLog: (level, ...args) =>
		set((state) => {
			const message = args.map(stringifyArg).join(' ')
			const newLog = {
				timestamp: new Date().toISOString(),
				level,
				message,
				details: args.length > 1 ? args : undefined,
			}

			// 在控制台打印日志
			console.log(`[${newLog.timestamp}] [${level}] ${message}`)

			return {
				logs: [
					...state.logs,
					{
						timestamp: new Date().toISOString(),
						level,
						message,
						details: args.length > 1 ? args : undefined,
					},
				],
			}
		}),
	clearLogs: () => set({ logs: [] }),
}))

const createLogFunction =
	(level: LogLevel) =>
	(...args: any[]) => {
		useLogger.getState().addLog(level, ...args)
	}

export const logInfo = createLogFunction('INFO')
export const logWarn = createLogFunction('WARN')
export const logError = createLogFunction('ERROR')

export const useLoggerHook = () => useStore(useLogger)
