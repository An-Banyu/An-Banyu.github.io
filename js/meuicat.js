const changeTime = (time, more = false) => {
  const currentDate = new Date()

  const formatTimestamp = (date) => {
    const d = new Date(date)
    const pad = (num) => String(num).padStart(2, '0')
    return `${pad(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` + `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const calculateDiff = (date1, date2, unit) => {
    const units = { day: 24 * 60 * 60 * 1000, hour: 60 * 60 * 1000 }
    return Math.floor(Math.abs(date1 - date2) / units[unit])
  }

  const describeTime = (datetime) => {
    const timeObj = new Date(datetime)
    const diffDays = calculateDiff(timeObj, currentDate, 'day')
    const diffHours = calculateDiff(timeObj, currentDate, 'hour')

    if (diffHours < 1) return `最近`
    if (diffHours <= 24) return `${diffHours}小时前`
    if (diffDays === 1) return `昨天`
    if (diffDays === 2) return `前天`
    if (diffDays <= 7) return `${diffDays}天前`

    const year = timeObj.getFullYear()
    const month = timeObj.getMonth() + 1
    const date = timeObj.getDate()
    return year !== currentDate.getFullYear() ? `${year}/${month}/${date}` : `${month}/${date}`
  }

  if (more) return formatTimestamp(time)
  if (time) return describeTime(time)

  document.querySelectorAll('time.datatime').forEach((e) => { e.textContent = describeTime(e.getAttribute('datetime')) })
}

let commentData

const comment = {
  fetchData: async (option) => {
    const res = await fetch('https://twikoo.anbanyu.cn', {
      method: "POST",
      body: JSON.stringify({
        "event": "GET_RECENT_COMMENTS",
        "accessToken": "3215dc62a77451b4c560d3d16303d2b5",
        "includeReply": true,
        "pageSize": -1,
        ...option
      }),
      headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json())
    
    return res.data
  },
  new: async (type, exclude) => {
    const comments = document.getElementById('comments-page')
    if (!comments) return

    const commentclick = () => {
      document.querySelectorAll('#comment-tool a').forEach(e =>
        e.addEventListener('click', comment.operate)
      )
    }
    const [a, b, c] = [`<a href="javascript:void(0)" data-type="post" title="显示此文章所有评论">查看更多</a>`, `<a href="javascript:void(0)" data-type="visitor" title="显示该评论者的所有评论">查看Ta更多评论</a>`, `<a href="javascript:void(0)" data-type="all" title="查看本站最新评论">返回评论</a>`]

    let data, tool, html = ''
    if (!commentData) commentData = await comment.fetchData()
    data = commentData
    if (type) data = data.filter(item => item[type] === exclude), tool = type === 'mailMd5' ? a + c : b + c
    else data = data.slice(0, 50), tool = a + b
    if (!ArticleData) await toRandomPost(true)

    data.forEach(item => {
      const time = changeTime(item.created, true)
      const title = Object.values(ArticleData).flatMap(data => data).find(article => article.link === item.url)?.title || '未知标题'

      html += `<div class="comment-card"><div class="comment-info"><img src="${item.avatar}"><div class="comment-information"><span class="comment-user ${item.mailMd5 === '91afb88f9ce8126f2825f7ef9fd64ceb' ? 'comment-author' : ''}" data-mailmd5="${item.mailMd5}">${item.nick}</span><span class="comment-time">${time}</span></div></div><div class="comment-content">${item.commentText.trim()}</div><div class="comment-more"><div class="comment-title"><span class="comment-link" title="查看此文章" onclick="pjax.loadUrl('${item.url}')"><i class="iconfont icat-read"></i>${title}</span><a href="javascript:void(0)" onclick="pjax.loadUrl('${item.url}#${item.id}')">查看评论</a></div><div id="comment-tool">${tool}</div></div></div>`
    })
    comments.innerHTML = html
    commentclick()
  },
  operate: (event) => {
    const type = event.target.getAttribute('data-type')
    const commentCard = event.target.closest('.comment-card')
    if (type === 'visitor') comment.new('mailMd5', commentCard.querySelector('.comment-user').getAttribute('data-mailmd5'))
    if (type === 'post') comment.new('url', commentCard.querySelector('.comment-link').getAttribute('onclick').split("'")[1])
    if (type === 'all') comment.new()
  }
}
btf.addGlobalFn('pjaxComplete', comment.new(), 'comment')

let ArticleData

const toRandomPost = async () => {
  if (!ArticleData) ArticleData = await fetch('/articles.json').then(res => res.json())
}
