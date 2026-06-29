import ermeiPhoto from '@/assets/img/cat-photos/2妹-三花猫-transparent.png'
import yidiPhoto from '@/assets/img/cat-photos/一弟-猫头鹰-transparent.png'
import yimeiPhoto from '@/assets/img/cat-photos/一妹-三花猫-transparent.png'
import sanmeiPhoto from '@/assets/img/cat-photos/三妹-三花猫-transparent.png'
import sandiPhoto from '@/assets/img/cat-photos/三弟-穿绿衣服的粽子狸花猫-transparent.png'
import erdiPhoto from '@/assets/img/cat-photos/二弟-蓝短猫-transparent.png'
import huanuPhoto from '@/assets/img/cat-photos/花奴-三花猫-transparent.png'

const transparentCatPhotos: Record<string, string> = {
  '2妹-三花猫.jpg': ermeiPhoto,
  '一弟-猫头鹰.jpg': yidiPhoto,
  '一妹-三花猫.jpg': yimeiPhoto,
  '三妹-三花猫.jpg': sanmeiPhoto,
  '三弟-穿绿衣服的粽子狸花猫.jpg': sandiPhoto,
  '二弟-蓝短猫.jpg': erdiPhoto,
  '花奴-三花猫.jpg': huanuPhoto,
}

export function getCatPhotoUrl(photoKey: string): string {
  return transparentCatPhotos[photoKey] ?? huanuPhoto
}
