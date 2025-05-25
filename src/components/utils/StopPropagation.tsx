import { PropsWithChildren } from 'react'
import { View } from 'react-native'

export const StopPropagation = ({ children }: PropsWithChildren) => {
	return (
		<View
			onStartShouldSetResponder={() => true}
			onTouchEnd={(e) => e.stopPropagation()}
			style={{
				flex: 1,
				flexDirection: 'row',
				alignItems: 'flex-end',
				justifyContent: 'center',
			}}
		>
			{children}
		</View>
	)
}
