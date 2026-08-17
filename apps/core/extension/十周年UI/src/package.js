/**
 * @fileoverview 扩展包信息定义
 */

/**
 * 生成扩展包信息
 * @param {Object} otherInfo - info.json中的其他信息
 * @returns {Object}
 */
export const mainpackage = otherInfo => {
	const pkg = {
		character: { character: {}, translate: {} },
		card: { card: {}, translate: {}, list: [] },
		skill: { skill: {}, translate: {} },
	};

	const pack = { ...pkg, ...otherInfo };

	const githubUrl = "https://github.com/diandian157/decadeUI";
	const copyHandler = `navigator.clipboard.writeText('${githubUrl}').then(() => alert('已成功复制，粘贴到浏览器打开，部分进不去需要翻墙')).catch(() => alert('复制失败，请手动复制'))`;

	pack.intro = `<a href="javascript:void(0)" onclick="${copyHandler}" style="color: #FFFACD;">点击复制仓库地址</a>`;
	pack.author = "缘阁少阁主改";

	return pack;
};
