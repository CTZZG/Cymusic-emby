import { Redirect } from 'expo-router'

export default function Unmatched() {
	// 重定向到主页
	return <Redirect href="/" />
}
