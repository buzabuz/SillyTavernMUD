const workspace = document.querySelector('.workspace');
const storyScroll = document.querySelector('#story-scroll');
const inspectorContent = document.querySelector('#inspector-content');
const actionInput = document.querySelector('#action-input');

const people = {
    rodolphus: {
        initials: 'RL',
        name: 'Rodolphus Lestrange',
        meta: ['纯血家族 · 前食死徒', '情绪：疲惫而清醒', '当前意图：用情报换取庇护'],
        summary: '他已经接受交易框架，并主动交出第一份高价值情报，但仍在观察这份诚意能买到什么。',
        tags: ['准备宣誓', '危险盟友', '主动示好'],
        relations: [
            ['信任', 47],
            ['亲密', 8],
            ['尊重', 68],
            ['戒备', 74],
        ],
        memories: [
            '你准确解释了 Lucius Malfoy 前往古灵阁的原因。',
            '他在宣誓前主动透露黑魔王正在秘密检查隐藏物品。',
        ],
    },
    kharza: {
        initials: 'KH',
        name: 'Kharza',
        meta: ['契约书记官', '情绪：冷静', '当前意图：完成誓约文本'],
        summary: '她把自己放在观察者位置，只对契约中可执行的事实作出反应。',
        tags: ['专业中立', '契约见证', '信息敏锐'],
        relations: [
            ['信任', 59],
            ['亲密', 12],
            ['尊重', 76],
            ['戒备', 39],
        ],
        memories: [
            '你要求所有口头承诺必须在宣誓前写入契约。',
            '你拒绝把“忠诚”作为无法验证的交易筹码。',
        ],
    },
    dradnok: {
        initials: 'DR',
        name: 'Dradnok',
        meta: ['庄园护卫', '情绪：戒备', '当前意图：确认 Rodolphus 没有发动袭击'],
        summary: '他不参与交易判断，但会把任何突然施法视为敌对行为。',
        tags: ['武力威慑', '有限信任', '保护职责'],
        relations: [
            ['信任', 42],
            ['亲密', 5],
            ['尊重', 61],
            ['戒备', 83],
        ],
        memories: [
            '你允许他在议事厅内保持武装。',
            '你曾在一次伏击中接受他的撤退建议。',
        ],
    },
};

const inspectorViews = {
    clues: `
        <section class="inspector-card">
            <span class="eyebrow">已知线索 · 4</span>
            <h2>黑魔王的隐藏物品</h2>
        </section>
        <section class="inspector-card">
            <h3>线索与判断</h3>
            <ul class="fact-list">
                <li>Travers 被秘密派往北方海岸的洞穴<small>Rodolphus 提供 · 中高可信</small></li>
                <li>Lestrange 家养小精灵曾被临时征用<small>Rodolphus 亲历 · 高可信</small></li>
                <li>黑魔王在每次报告后更加焦躁<small>长期观察 · 中高可信</small></li>
                <li>目标可能不止一个，并分散隐藏<small>你的判断 · 尚未证实</small></li>
            </ul>
        </section>
        <section class="inspector-card">
            <h3>你的承诺</h3>
            <ul class="fact-list">
                <li>宣誓完成后提供安全身份<small>等待契约生效</small></li>
            </ul>
        </section>
    `,
    status: `
        <section class="inspector-card">
            <div class="inspector-profile">
                <div class="large-avatar">CS</div>
                <div>
                    <h2>Countess Selwyn</h2>
                    <div class="profile-meta">
                        <span>黑镜庄园代理人</span>
                        <span>总体潜质：高阶契约魔法</span>
                        <span>当前状态：稳定</span>
                    </div>
                </div>
            </div>
        </section>
        <section class="inspector-card">
            <h3>状态轨</h3>
            <div class="status-track">
                <header><span>体力</span><strong>5 / 6</strong></header>
                <div class="track-cells">
                    <i class="filled"></i><i class="filled"></i><i class="filled"></i>
                    <i class="filled"></i><i class="filled"></i><i></i>
                </div>
            </div>
            <div class="status-track">
                <header><span>压力</span><strong>2 / 6</strong></header>
                <div class="track-cells">
                    <i class="filled"></i><i class="filled"></i><i></i>
                    <i></i><i></i><i></i>
                </div>
            </div>
            <div class="tag-row">
                <span class="tag">墨水沾染</span>
                <span class="tag">轻微疲劳</span>
            </div>
        </section>
        <section class="inspector-card">
            <h3>常用能力</h3>
            <ul class="fact-list">
                <li>魅力 15 <small>修正 +2</small></li>
                <li>感知 14 <small>修正 +2</small></li>
                <li>审讯 9 <small>技能修正 +2 · 68% 成长进度</small></li>
            </ul>
        </section>
    `,
    inventory: `
        <section class="inspector-card">
            <span class="eyebrow">当前桌面 · 5 件</span>
            <h2>契约与施法物</h2>
        </section>
        <section class="inspector-card">
            <ul class="item-list">
                <li>黑镜契约原本<small>最后一行尚未签署</small></li>
                <li>烟色窥镜<small>用于隔离身份与视线</small></li>
                <li>白蜡封印<small>契约确认后使用</small></li>
                <li>十四英寸黑刺李木魔杖<small>当前置于右手可及范围</small></li>
            </ul>
        </section>
    `,
    map: `
        <section class="inspector-card">
            <span class="eyebrow">黑镜庄园</span>
            <h2>议事区域</h2>
        </section>
        <section class="inspector-card">
            <button class="mini-map inspector-map" type="button">
                <span class="map-node node-west">前厅</span>
                <span class="map-path path-one"></span>
                <span class="map-node node-current">你在这里</span>
                <span class="map-path path-two"></span>
                <span class="map-node node-east">契约室</span>
                <span class="map-node node-locked">密档库</span>
            </button>
        </section>
        <section class="inspector-card">
            <h3>可达地点</h3>
            <ul class="fact-list">
                <li>前厅 · 约 2 分钟<small>护卫 2 人 · 可正常离开</small></li>
                <li>契约室 · 相邻<small>宣誓完成后开放</small></li>
                <li>密档库 · 未知<small>当前封锁 · 需要庄园许可</small></li>
            </ul>
        </section>
    `,
    schedule: `
        <section class="inspector-card">
            <span class="eyebrow">11 月 3 日 · 深夜</span>
            <h2>交涉时序</h2>
        </section>
        <section class="inspector-card">
            <ul class="fact-list">
                <li>20:30 · 庄园封闭<small>已完成 · 外部警戒启动</small></li>
                <li>20:56 · Rodolphus 入场<small>已完成 · 魔杖已检查</small></li>
                <li>21:12 · 接受交易框架<small>已完成 · 等待宣誓</small></li>
                <li>21:18 · 主动交出情报<small>当前 · 第一枚信物</small></li>
                <li>之后 · 契约签署<small>取决于你的回应</small></li>
            </ul>
        </section>
    `,
    memory: `
        <section class="inspector-card">
            <span class="eyebrow">关系记忆</span>
            <h2>Rodolphus 记得什么</h2>
        </section>
        <section class="inspector-card">
            <h3>受保护细节锚点</h3>
            <ul class="fact-list">
                <li>三分之五的食死徒财富已转入妖精托管<small>你提供 · 本次交涉 · 改变了他对 Malfoy 的判断</small></li>
                <li>黑魔王害怕隐藏物品出问题<small>他主动提供 · 第一枚信物</small></li>
            </ul>
        </section>
    `,
    check: `
        <section class="inspector-card">
            <span class="eyebrow">判定依据</span>
            <h2>判断 Rodolphus 是否隐瞒条件</h2>
        </section>
        <section class="inspector-card">
            <ul class="fact-list">
                <li>感知 14<small>属性修正 +2</small></li>
                <li>洞察 9<small>技能修正 +2</small></li>
                <li>对方主动示好<small>情境修正 +1</small></li>
                <li>D20 掷骰：15<small>最终总值 20 · 重大成功</small></li>
            </ul>
        </section>
    `,
    timeline: `
        <section class="inspector-card">
            <span class="eyebrow">当前世界</span>
            <h2>时间线提交点</h2>
        </section>
        <section class="inspector-card">
            <ul class="fact-list">
                <li>21:18 · Rodolphus 交出第一份情报<small>自动保存 · 当前提交点</small></li>
                <li>21:12 · 接受宣誓条件<small>自动保存</small></li>
                <li>20:56 · 进入议事厅<small>自动保存</small></li>
                <li>20:30 · 庄园封闭<small>可从此复制新分支</small></li>
            </ul>
        </section>
    `,
    log: `
        <section class="inspector-card">
            <span class="eyebrow">本轮调用</span>
            <h2>状态与模型记录</h2>
        </section>
        <section class="inspector-card">
            <ul class="fact-list">
                <li>规则层 · 意图解析<small>识别动作、直接台词和内心判断三个意图层</small></li>
                <li>低端 AI · 现场叙事者<small>2,946 Token · 3.4 秒</small></li>
                <li>中端 AI · 角色导演<small>更新动机、信任和主动示好记忆</small></li>
                <li>状态写入<small>新增线索 4 条 · 世界时间 +6 分钟</small></li>
            </ul>
        </section>
    `,
};

function renderPerson(personId) {
    const person = people[personId] ?? people.rodolphus;
    inspectorContent.innerHTML = `
        <section class="inspector-card">
            <div class="inspector-profile">
                <div class="large-avatar">${person.initials}</div>
                <div>
                    <h2>${person.name}</h2>
                    <div class="profile-meta">
                        ${person.meta.map(value => `<span>${value}</span>`).join('')}
                    </div>
                </div>
            </div>
        </section>
        <section class="inspector-card">
            <h3>你对关系的判断</h3>
            <p>${person.summary}</p>
            <div class="tag-row">
                ${person.tags.map(value => `<span class="tag">${value}</span>`).join('')}
            </div>
        </section>
        <section class="inspector-card">
            <h3>关系倾向</h3>
            <ul class="relation-list">
                ${person.relations.map(([label, value]) => `
                    <li>
                        <span>${label}</span>
                        <span class="relation-meter"><i style="width:${value}%"></i></span>
                    </li>
                `).join('')}
            </ul>
        </section>
        <section class="inspector-card">
            <h3>相关经历</h3>
            <ul class="fact-list">
                ${person.memories.map(value => `<li>${value}</li>`).join('')}
            </ul>
        </section>
    `;
}

function setInspectorView(view) {
    if (view === 'context') {
        renderPerson('rodolphus');
        return;
    }

    inspectorContent.innerHTML = inspectorViews[view] ?? inspectorViews.clues;
}

function setActiveInspectorTab(tabName) {
    document.querySelectorAll('.inspector-tabs button').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabName);
    });
}

function openOverlay(name) {
    const overlay = document.querySelector(`#${name}-overlay`);
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
}

function closeOverlay(name) {
    const overlay = document.querySelector(`#${name}-overlay`);
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
}

function appendPlayerMessage(text, label = '你的回合 · 混合表达') {
    const article = document.createElement('article');
    article.className = 'player-message message';

    const body = document.createElement('div');
    body.className = 'player-body';

    const kind = document.createElement('span');
    kind.className = 'message-kind';
    kind.textContent = label;

    const paragraph = document.createElement('p');
    paragraph.textContent = text;

    const avatar = document.createElement('div');
    avatar.className = 'dialogue-avatar player';
    avatar.textContent = 'CS';

    body.append(kind, paragraph);
    article.append(body, avatar);
    storyScroll.append(article);
}

function appendMockResponse() {
    const article = document.createElement('article');
    article.className = 'narration message';
    const paragraph = document.createElement('p');
    paragraph.textContent = '回合处理中……';
    article.append(paragraph);
    storyScroll.append(article);
    storyScroll.scrollTop = storyScroll.scrollHeight;
}

document.querySelector('[data-collapse="scene"]').addEventListener('click', () => {
    workspace.classList.remove('scene-open');
    workspace.classList.add('scene-collapsed');
});

document.querySelector('#restore-scene').addEventListener('click', () => {
    workspace.classList.remove('scene-collapsed', 'focus-mode');
    if (window.matchMedia('(max-width: 1080px)').matches) {
        workspace.classList.add('scene-open');
    }
});

document.querySelector('#toggle-focus').addEventListener('click', event => {
    workspace.classList.toggle('focus-mode');
    event.currentTarget.textContent = workspace.classList.contains('focus-mode') ? '退出专注' : '专注';
});

document.querySelectorAll('.person-row').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.person-row').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        setActiveInspectorTab('context');
        renderPerson(button.dataset.person);
    });
});

document.querySelectorAll('.inspector-tabs button').forEach(button => {
    button.addEventListener('click', () => {
        setActiveInspectorTab(button.dataset.tab);
        setInspectorView(button.dataset.tab);
    });
});

document.querySelectorAll('[data-inspector]').forEach(button => {
    button.addEventListener('click', () => {
        setActiveInspectorTab('');
        setInspectorView(button.dataset.inspector);
    });
});

document.querySelector('#composer').addEventListener('submit', event => {
    event.preventDefault();
    const text = actionInput.value.trim();
    if (!text) {
        actionInput.focus();
        return;
    }

    appendPlayerMessage(text);
    actionInput.value = '';
    actionInput.style.height = '';
    storyScroll.scrollTop = storyScroll.scrollHeight;
    window.setTimeout(appendMockResponse, 450);
});

actionInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        document.querySelector('#composer').requestSubmit();
    }
});

document.querySelector('#prepare-roll').addEventListener('click', () => openOverlay('roll'));
document.querySelector('#request-check').addEventListener('click', () => openOverlay('roll'));
document.querySelector('#open-models').addEventListener('click', () => openOverlay('model'));

function insertAtCursor(text, caretOffset = text.length) {
    const start = actionInput.selectionStart ?? actionInput.value.length;
    const end = actionInput.selectionEnd ?? start;
    const before = actionInput.value.slice(0, start);
    const after = actionInput.value.slice(end);
    const separator = before && !before.endsWith('\n') ? '\n' : '';

    actionInput.value = `${before}${separator}${text}${after}`;
    const nextCaret = start + separator.length + caretOffset;
    actionInput.setSelectionRange(nextCaret, nextCaret);
    actionInput.dispatchEvent(new Event('input'));
    window.setTimeout(() => {
        actionInput.focus();
        actionInput.setSelectionRange(nextCaret, nextCaret);
    }, 0);
}

document.querySelectorAll('#expression-menu wa-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
        const templates = {
            speech: { text: '“……”', caret: 1 },
            action: { text: '我……', caret: 1 },
            thought: { text: '我心里想：……', caret: 5 },
        };
        const template = templates[item.getAttribute('value')];
        if (template) insertAtCursor(template.text, template.caret);
    });
});

document.querySelector('#insert-spell').addEventListener('click', () => {
    insertAtCursor('我举起魔杖，念出：“……”', 9);
});

actionInput.addEventListener('input', () => {
    actionInput.style.height = 'auto';
    actionInput.style.height = `${Math.min(actionInput.scrollHeight, 180)}px`;
});

document.querySelector('#open-timeline').addEventListener('click', () => {
    setActiveInspectorTab('');
    setInspectorView('timeline');
});

document.querySelector('#open-character').addEventListener('click', () => {
    setActiveInspectorTab('status');
    setInspectorView('status');
});

document.querySelector('#open-log').addEventListener('click', () => {
    setActiveInspectorTab('');
    setInspectorView('log');
});

document.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => closeOverlay(button.dataset.close));
});

document.querySelector('#revise-action').addEventListener('click', () => {
    closeOverlay('roll');
    actionInput.value = '我没有立刻接受他的宣誓，而是把契约压回桌面。\\n“那座洞穴里藏着什么？”\\n我观察他的呼吸，判断这次迟疑是否出于恐惧。';
    actionInput.dispatchEvent(new Event('input'));
    actionInput.focus();
});

document.querySelector('#rejudge-action').addEventListener('click', event => {
    event.currentTarget.textContent = '裁定已刷新';
    document.querySelector('.formula-strip').firstElementChild.innerHTML = '智识 <strong>+2</strong>';
});

document.querySelector('#roll-die').addEventListener('click', event => {
    const die = document.querySelector('#dice-placeholder');
    const dieLabel = die.querySelector('span');
    const result = document.querySelector('#dice-result-text');
    const button = event.currentTarget;

    if (button.disabled) return;

    button.disabled = true;
    die.classList.add('rolling');
    result.textContent = 'D20 正在滚动……';

    const ticker = window.setInterval(() => {
        dieLabel.textContent = String(Math.floor(Math.random() * 20) + 1);
    }, 80);

    window.setTimeout(() => {
        window.clearInterval(ticker);
        die.classList.remove('rolling');
        dieLabel.textContent = '17';
        result.textContent = '17 + 3 · 重大成功';
        button.textContent = '结果已提交';

        window.setTimeout(() => {
            closeOverlay('roll');
            document.querySelector('#completed-check').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 1000);
    }, 1500);
});

document.querySelectorAll('.preset-row button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.preset-row button').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
    });
});

renderPerson('rodolphus');
