// ==UserScript==
// @name         给 V2EX 用户打标签
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  try to take over the world!
// @author       You
// @match        https://www.v2ex.com/*
// @match        http*://*.v2ex.com/*
// @match        http*://v2ex.com/*s
// @match        https://v2ex.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=v2ex.com
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// ==/UserScript==

(function () {
    'use strict';
    const GIST_FILE_NAME = 'v2ex-user-tags.json';

    const GIST_TOKEN = localStorage.getItem('GIST_TOKEN');
    if (GIST_TOKEN === null || GIST_TOKEN === 'null'||  GIST_TOKEN === ''  || GIST_TOKEN === undefined || GIST_TOKEN === 'undefined') {
        localStorage.setItem('GIST_TOKEN', prompt('请输入用于读写 Gist 的 GitHub Token,创建时可仅勾选 创建Gist 权限, https://github.com/settings/tokens'));
    }

    const GIST_ID = localStorage.getItem('GIST_ID');
    if (GIST_ID === null || GIST_ID === 'null' || GIST_ID === '' || GIST_ID === undefined || GIST_ID === 'undefined') {
        localStorage.setItem('GIST_ID', prompt('请输入创建完成的 Gist ID, https://gist.github.com/'));
    }

    function readAllTags() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://api.github.com/gists/${GIST_ID}`,
                headers: {
                    "Accept": "application/vnd.github+json",
                    "Authorization": "Bearer " + GIST_TOKEN,
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                onload: (res) => {
                    if (res.status === 401) {
                        localStorage.setItem('GIST_TOKEN', prompt('Please input your gist token'));
                        location.reload();
                    }
                    const data = JSON.parse(res.responseText).files[GIST_FILE_NAME].content;
                    const map = new Map(JSON.parse(data));
                    resolve(map);
                },
                onerror: (err) => {
                    reject(err);
                }
            });
        });
    }

    function writeTagByUsername(username, tags) {
        return new Promise(async (resolve, reject) => {
            let map = await readAllTags()
            map.set(username, tags)
            if (tags.length === 1 && tags[0] === '') {
                map.delete(username)
            }
            let data = {
                "description": "An updated gist description",
                "files": {
                    [GIST_FILE_NAME]: {
                        "content": JSON.stringify([...map])
                    },
                },
            }
            GM_xmlhttpRequest({
                method: "PATCH",
                url: `https://api.github.com/gists/${GIST_ID}`,
                headers: {
                    "Accept": "application/vnd.github+json",
                    "Authorization": "Bearer " + GIST_TOKEN,
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                data: JSON.stringify(data),
                onload: (res) => {
                    if (res.status === 401) {
                        localStorage.setItem('GIST_TOKEN', prompt('Please input your gist token'));
                        location.reload();
                    }
                    resolve();
                },
                onerror: (err) => {
                    debugger
                    reject(err);
                }
            });
        });
    }

    async function main() {
        let users = document.querySelectorAll('strong > a[href^="/member/"], small > a[href^="/member/"]')
        let map = await readAllTags();
        for (let i = 0; i < users.length; i++) {
            let user = users[i]
            if (user.children.length === 0) {
                let username = user.innerHTML
                if (map.has(username)) {
                    // tags is an array
                    let tags = map.get(username)
                    for (let j = 0; j < tags.length; j++) {
                        let tag = tags[j]
                        let tagElement = document.createElement('a')
                        // click to update tag
                        tagElement.onclick = () => promptToWriteTag(username, tags, ',')
                        tagElement.className = 'tag'
                        tagElement.style.color = 'red'
                        tagElement.style.paddingLeft = '5px'
                        tagElement.innerHTML = '<li class="fa fa-tag"></li> ' + tag
                        user.parentNode.insertBefore(tagElement, user.nextSibling)
                    }
                } else {
                    // add tag
                    let tagElement = document.createElement('a')
                    tagElement.onclick = () => promptToWriteTag(username, [], '')
                    tagElement.className = 'tag'
                    tagElement.style.paddingLeft = '5px'
                    tagElement.innerHTML = '<li class="fa fa-tag"></li> '
                    user.parentNode.insertBefore(tagElement, user.nextSibling)
                }
            }
        }
    }

    /**
     * @param {string} username
     * @param {string[]} tags
     * @param {string} separator
     * @returns {void}
     * @example
     * promptToWriteTag('username', ['tag1', 'tag2'], ',')
     * promptToWriteTag('username', ['tag1', 'tag2'], '')
     *  */
    async function promptToWriteTag(username, tags, separator) {
        let newTags = prompt('请输入标记,逗号分隔', tags.join(separator))
        let newTagsArray = newTags.split(',')
        await writeTagByUsername(username, newTagsArray)
        location.reload()
    }

    main();
})();
