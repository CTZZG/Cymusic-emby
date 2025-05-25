import { internalSerializeKey, sortIndexSymbol, timeStampSymbol } from '@/constants/commonConst'
import MediaMeta from '@/store/mediaExtra'

/** 获取mediakey */
export function getMediaKey(mediaItem: ICommon.IMediaBase) {
	return `${mediaItem.platform}@${mediaItem.id}`
}

/** 比较两media是否相同 */
export function isSameMediaItem(
	a: ICommon.IMediaBase | null | undefined,
	b: ICommon.IMediaBase | null | undefined,
) {
	return a && b && a.id == b.id && a.platform === b.platform
}

/** 查找是否存在 */
export function includesMedia(
	a: ICommon.IMediaBase[] | null | undefined,
	b: ICommon.IMediaBase | null | undefined,
) {
	if (!a || !b) {
		return false
	}
	return a.findIndex((_) => isSameMediaItem(_, b)) !== -1
}

/** 获取复位的mediaItem */
// export function resetMediaItem<T extends Partial<ICommon.IMediaBase>>(
//     mediaItem: T,
//     platform?: string,
//     newObj?: boolean,
// ): T {
//     // 本地音乐不做处理
//     if (
//         mediaItem.platform === localPluginPlatform ||
//         platform === localPluginPlatform
//     ) {
//         return newObj ? {...mediaItem} : mediaItem;
//     }
//     if (!newObj) {
//         mediaItem.platform = platform ?? mediaItem.platform;
//         mediaItem[internalSerializeKey] = undefined;
//         return mediaItem;
//     } else {
//         return produce(mediaItem, _ => {
//             _.platform = platform ?? mediaItem.platform;
//             _[internalSerializeKey] = undefined;
//         });
//     }
// }

export function mergeProps(
	mediaItem: ICommon.IMediaBase,
	props: Record<string, any> | undefined,
	anotherProps?: Record<string, any> | undefined | null,
) {
	return props
		? {
				...mediaItem,
				...props,
				...(anotherProps ?? {}),
				id: mediaItem.id,
				platform: mediaItem.platform,
			}
		: mediaItem
}

export enum InternalDataType {
	LOCALPATH = 'localPath',
}

export function trimInternalData(mediaItem: ICommon.IMediaBase | null | undefined) {
	if (!mediaItem) {
		return undefined
	}
	return {
		...mediaItem,
		[internalSerializeKey]: undefined,
	}
}

/** 关联歌词 */
export async function associateLrc(musicItem: ICommon.IMediaBase, linkto: ICommon.IMediaBase) {
	if (!musicItem || !linkto) {
		throw new Error('')
	}

	// 如果相同直接断链
	MediaMeta.update(musicItem, {
		associatedLrc: isSameMediaItem(musicItem, linkto) ? undefined : linkto,
	})
}

export function sortByTimestampAndIndex(array: any[], newArray = false) {
	if (newArray) {
		array = [...array]
	}
	return array.sort((a, b) => {
		const ts = a[timeStampSymbol] - b[timeStampSymbol]
		if (ts !== 0) {
			return ts
		}
		return a[sortIndexSymbol] - b[sortIndexSymbol]
	})
}
