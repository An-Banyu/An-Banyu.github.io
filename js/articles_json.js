/**
 * MeuiCat
 * generate json - pages_posts_random
 * modify by yife.Liang
 */

'use strict'

hexo.extend.generator.register('thePages', function(locals) {
	const postData = locals.posts
		.filter(post => post.random !== false)
		.map(post => {
			const date = new Date(post.date);
			const formattedDate = date.toISOString().split('T')[0];
			return {
				title: post.title || "暂无标题",
				time: formattedDate,
				update: post.updated ? new Date(post.updated).toISOString().replace('T', ' ').split('.')[0] : formattedDate,
				link: post.permalink.replace(/^(?:\/\/|[^/]+)*\//, '/'),
				cover: post.cover || hexo.theme.config.default_top_img
			}
		})
		.sort((a, b) => new Date(b.time) - new Date(a.time))

	const exclude = ['.js', '.wechatOA', '.json'];
	const pageData = locals.pages
		.filter(page => {return page.random !== false && !exclude.some(ext => page.source.endsWith(ext));})
		.map(page => {
			const date = new Date(page.date);
			const formattedDate = date.toISOString().split('T')[0];
			return {
				title: page.title || "暂无标题",
				time: formattedDate,
				link: page.permalink.replace(/^(?:\/\/|[^/]+)*\//, '/').replace(/\/index\.html$/, '/')
			}
		})
	
	const jsonData = {
		post: postData,
		page: pageData
	}

	return {
		path: 'articles.json',
		data: JSON.stringify(jsonData)
	}
})
