// Authoritative Simplified Chinese display names are kept outside the generated
// English identity catalog so catalog regeneration cannot erase them.

export const CANON_LOCALIZATION_ZH_CN_VERSION = 1;

export const CANON_LOCALIZATION_ZH_CN_SOURCE =
    Object.freeze({
        primary:
            'Official Simplified Chinese Harry Potter book translations',
        reference:
            'https://www.games2learnchinese.com/free-chinese-resources/Harry-Potter-Chinese-Names.pdf',
        comparison:
            'https://www.cjvlang.com/Hpotter/names.html',
    });

const localized = (
    nameZh,
    aliases = [],
) => Object.freeze({
    nameZh,
    aliases: Object.freeze([
        ...aliases,
    ]),
});

export const CANON_LOCALIZATION_ZH_CN =
    Object.freeze({
        canon_aberforth_dumbledore:
            localized(
                '阿不福思·邓布利多',
                ['阿不福思'],
            ),
        canon_albus_dumbledore:
            localized(
                '阿不思·邓布利多',
                ['邓布利多', '阿不思'],
            ),
        canon_harry_james_potter:
            localized(
                '哈利·波特',
                ['哈利波特', '哈利'],
            ),
        canon_ronald_bilius_weasley:
            localized(
                '罗恩·韦斯莱',
                [
                    '罗恩',
                    '罗纳德·比利厄斯·韦斯莱',
                ],
            ),
        canon_hermione_jean_granger:
            localized(
                '赫敏·格兰杰',
                [
                    '赫敏',
                    '赫敏·简·格兰杰',
                ],
            ),
        canon_draco_malfoy:
            localized(
                '德拉科·马尔福',
                ['德拉科', '马尔福'],
            ),
        canon_neville_longbottom:
            localized(
                '纳威·隆巴顿',
                ['纳威', '隆巴顿'],
            ),
        canon_lavender_brown:
            localized(
                '拉文德·布朗',
                ['拉文德'],
            ),
        canon_parvati_patil:
            localized(
                '帕瓦蒂·佩蒂尔',
                ['帕瓦蒂'],
            ),
        canon_padma_patil:
            localized(
                '帕德玛·佩蒂尔',
                ['帕德玛'],
            ),
        canon_dean_thomas:
            localized(
                '迪安·托马斯',
                ['迪安', '迪恩·托马斯'],
            ),
        canon_seamus_finnigan:
            localized(
                '西莫·斐尼甘',
                [
                    '西莫',
                    '谢莫斯·芬尼根',
                ],
            ),
        canon_vincent_crabbe:
            localized(
                '文森特·克拉布',
                ['克拉布'],
            ),
        canon_gregory_goyle:
            localized(
                '格雷戈里·高尔',
                ['高尔'],
            ),
        canon_pansy_parkinson:
            localized(
                '潘西·帕金森',
                ['潘西'],
            ),
        canon_blaise_zabini:
            localized(
                '布雷斯·沙比尼',
                ['布雷斯'],
            ),
        canon_hannah_abbott:
            localized(
                '汉娜·艾博',
                ['汉娜'],
            ),
        canon_susan_bones:
            localized(
                '苏珊·博恩斯',
                ['苏珊'],
            ),
        canon_justin_finch_fletchley:
            localized(
                '贾斯廷·芬列里',
                ['贾斯廷'],
            ),
        canon_ernie_macmillan:
            localized(
                '厄尼·麦克米兰',
                ['厄尼'],
            ),
        canon_terry_boot:
            localized(
                '泰瑞·布特',
                ['泰瑞'],
            ),
        canon_anthony_goldstein:
            localized(
                '安东尼·戈德斯坦',
                ['安东尼'],
            ),
        canon_michael_corner:
            localized(
                '迈克尔·科纳',
                ['迈克尔'],
            ),
        canon_luna_lovegood:
            localized(
                '卢娜·洛夫古德',
                ['卢娜'],
            ),
        canon_cho_chang:
            localized(
                '秋·张',
                ['秋张', '秋'],
            ),
        canon_cedric_diggory:
            localized(
                '塞德里克·迪戈里',
                ['塞德里克'],
            ),
        canon_colin_creevey:
            localized(
                '科林·克里维',
                ['科林'],
            ),
        canon_dennis_creevey:
            localized(
                '丹尼斯·克里维',
                ['丹尼斯'],
            ),
        canon_ginevra_ginny_molly_weasley:
            localized(
                '金妮·韦斯莱',
                [
                    '金妮',
                    '吉妮·韦斯莱',
                ],
            ),
        canon_fred_weasley:
            localized(
                '弗雷德·韦斯莱',
                ['弗雷德'],
            ),
        canon_george_weasley:
            localized(
                '乔治·韦斯莱',
                ['乔治'],
            ),
        canon_percy_ignatius_weasley:
            localized(
                '珀西·韦斯莱',
                ['珀西'],
            ),
        canon_oliver_wood:
            localized(
                '奥利弗·伍德',
                ['奥利弗', '伍德'],
            ),
        canon_angelina_johnson:
            localized(
                '安吉利娜·约翰逊',
                ['安吉利娜'],
            ),
        canon_alicia_spinnet:
            localized(
                '艾丽娅·斯平内特',
                ['艾丽娅'],
            ),
        canon_katie_bell:
            localized(
                '凯蒂·贝尔',
                ['凯蒂'],
            ),
        canon_lee_jordan:
            localized(
                '李·乔丹',
                ['李乔丹'],
            ),
        canon_marcus_flint:
            localized(
                '马库斯·弗林特',
                ['马库斯'],
            ),
        canon_cormac_mclaggen:
            localized(
                '科麦克·麦克拉根',
                ['科麦克'],
            ),
        canon_romilda_vane:
            localized(
                '罗米达·万尼',
                ['罗米达'],
            ),
        canon_zacharias_smith:
            localized(
                '扎卡赖斯·史密斯',
                ['扎卡赖斯'],
            ),
        canon_marietta_edgecombe:
            localized(
                '玛丽埃塔·艾克莫',
                ['玛丽埃塔'],
            ),
        canon_minerva_mcgonagall:
            localized(
                '米勒娃·麦格',
                [
                    '麦格',
                    '麦格教授',
                    '米勒娃·麦格教授',
                ],
            ),
        canon_severus_snape:
            localized(
                '西弗勒斯·斯内普',
                ['斯内普', '斯内普教授'],
            ),
        canon_rubeus_hagrid:
            localized(
                '鲁伯·海格',
                ['海格'],
            ),
        canon_filius_flitwick:
            localized(
                '菲利乌斯·弗立维',
                ['弗立维', '弗立维教授'],
            ),
        canon_pomona_sprout:
            localized(
                '波莫娜·斯普劳特',
                ['斯普劳特', '斯普劳特教授'],
            ),
        canon_quirinus_quirrell:
            localized(
                '奎里纳斯·奇洛',
                ['奇洛', '奇洛教授'],
            ),
        canon_sybill_trelawney:
            localized(
                '西比尔·特里劳妮',
                ['特里劳妮', '特里劳妮教授'],
            ),
        canon_cuthbert_binns:
            localized(
                '卡斯伯特·宾斯',
                ['宾斯', '宾斯教授'],
            ),
        canon_rolanda_hooch:
            localized(
                '罗兰达·霍琦',
                ['霍琦', '霍琦夫人'],
            ),
        canon_argus_filch:
            localized(
                '阿格斯·费尔奇',
                ['费尔奇'],
            ),
        canon_poppy_pomfrey:
            localized(
                '波比·庞弗雷',
                ['庞弗雷', '庞弗雷夫人'],
            ),
        canon_irma_pince:
            localized(
                '伊尔玛·平斯',
                ['平斯', '平斯夫人'],
            ),
        canon_gilderoy_lockhart:
            localized(
                '吉德罗·洛哈特',
                ['洛哈特', '洛哈特教授'],
            ),
        canon_remus_john_lupin:
            localized(
                '莱姆斯·卢平',
                ['卢平', '卢平教授'],
            ),
        canon_alastor_moody:
            localized(
                '阿拉斯托·穆迪',
                ['穆迪', '疯眼汉穆迪'],
            ),
        canon_dolores_umbridge:
            localized(
                '多洛雷斯·乌姆里奇',
                ['乌姆里奇', '乌姆里奇教授'],
            ),
        canon_horace_slughorn:
            localized(
                '霍拉斯·斯拉格霍恩',
                ['斯拉格霍恩', '斯拉格霍恩教授'],
            ),
        canon_wilhelmina_grubbly_plank:
            localized(
                '威尔米娜·格拉普兰',
                ['格拉普兰教授'],
            ),
        canon_aurora_sinistra:
            localized(
                '奥罗拉·辛尼斯塔',
                ['辛尼斯塔教授'],
            ),
        canon_septima_vector:
            localized(
                '塞蒂玛·维克多',
                ['维克多教授'],
            ),
        canon_arthur_weasley:
            localized(
                '亚瑟·韦斯莱',
                ['亚瑟'],
            ),
        canon_molly_weasley:
            localized(
                '莫丽·韦斯莱',
                ['莫丽'],
            ),
        canon_bill_weasley:
            localized(
                '比尔·韦斯莱',
                ['比尔'],
            ),
        canon_charlie_weasley:
            localized(
                '查理·韦斯莱',
                ['查理'],
            ),
        canon_lucius_malfoy:
            localized(
                '卢修斯·马尔福',
                ['卢修斯'],
            ),
        canon_narcissa_malfoy:
            localized(
                '纳西莎·马尔福',
                ['纳西莎'],
            ),
        canon_bellatrix_lestrange:
            localized(
                '贝拉特里克斯·莱斯特兰奇',
                ['贝拉特里克斯'],
            ),
        canon_sirius_black:
            localized(
                '小天狼星·布莱克',
                ['小天狼星', '天狼星·布莱克'],
            ),
        canon_james_potter:
            localized(
                '詹姆·波特',
                ['詹姆'],
            ),
        canon_lily_potter:
            localized(
                '莉莉·波特',
                ['莉莉'],
            ),
        canon_peter_pettigrew:
            localized(
                '小矮星彼得',
                ['彼得·佩迪鲁', '虫尾巴'],
            ),
        canon_vernon_dursley:
            localized(
                '弗农·德思礼',
                ['弗农姨父', '弗农'],
            ),
        canon_petunia_dursley:
            localized(
                '佩妮·德思礼',
                ['佩妮姨妈', '佩妮'],
            ),
        canon_dudley_dursley:
            localized(
                '达力·德思礼',
                ['达力'],
            ),
        canon_dobby:
            localized('多比'),
        canon_kreacher:
            localized('克利切'),
        canon_lord_voldemort:
            localized(
                '伏地魔',
                ['神秘人', '黑魔王'],
            ),
        canon_tom_marvolo_riddle:
            localized(
                '汤姆·马沃罗·里德尔',
                ['汤姆·里德尔', '里德尔'],
            ),
        canon_gellert_grindelwald:
            localized(
                '盖勒特·格林德沃',
                ['格林德沃'],
            ),
        canon_cornelius_oswald_fudge:
            localized(
                '康奈利·福吉',
                ['福吉', '福吉部长'],
            ),
        canon_rufus_scrimgeour:
            localized(
                '鲁弗斯·斯克林杰',
                ['斯克林杰'],
            ),
        canon_kingsley_shacklebolt:
            localized(
                '金斯莱·沙克尔',
                ['金斯莱'],
            ),
        canon_nymphadora_tonks:
            localized(
                '尼法朵拉·唐克斯',
                ['唐克斯'],
            ),
        canon_garrick_ollivander:
            localized(
                '加里克·奥利凡德',
                ['奥利凡德', '奥利凡德先生'],
            ),
        canon_godric_gryffindor:
            localized(
                '戈德里克·格兰芬多',
                ['戈德里克'],
            ),
        canon_salazar_slytherin:
            localized(
                '萨拉查·斯莱特林',
                ['萨拉查'],
            ),
        canon_rowena_ravenclaw:
            localized(
                '罗伊纳·拉文克劳',
                ['罗伊纳'],
            ),
        canon_helga_hufflepuff:
            localized(
                '赫尔加·赫奇帕奇',
                ['赫尔加'],
            ),
        canon_fleur_delacour:
            localized(
                '芙蓉·德拉库尔',
                ['芙蓉'],
            ),
        canon_viktor_krum:
            localized(
                '威克多尔·克鲁姆',
                ['克鲁姆'],
            ),
        canon_igor_karkaroff:
            localized(
                '伊戈尔·卡卡洛夫',
                ['卡卡洛夫'],
            ),
        canon_olympe_maxime:
            localized(
                '奥利姆·马克西姆',
                ['马克西姆夫人'],
            ),
        canon_rita_skeeter:
            localized(
                '丽塔·斯基特',
                ['丽塔'],
            ),
        canon_xenophilius_lovegood:
            localized(
                '谢诺菲留斯·洛夫古德',
                ['谢诺菲留斯'],
            ),
        canon_regulus_arcturus_black:
            localized(
                '雷古勒斯·布莱克',
                ['雷古勒斯', 'R.A.B.'],
            ),
        canon_barty_crouch_sr:
            localized(
                '巴蒂·克劳奇',
                ['老巴蒂·克劳奇'],
            ),
        canon_winky:
            localized('闪闪'),
        canon_ludo_bagman:
            localized(
                '卢多·巴格曼',
                ['卢多'],
            ),
        canon_amos_diggory:
            localized(
                '阿莫斯·迪戈里',
                ['阿莫斯'],
            ),
        canon_bathilda_bagshot:
            localized(
                '巴希达·巴沙特',
                ['巴希达'],
            ),
        canon_nicolas_flamel:
            localized(
                '尼可·勒梅',
                ['尼可勒梅'],
            ),
        canon_nearly_headless_nick:
            localized(
                '差点没头的尼克',
                ['尼克'],
            ),
        canon_peeves:
            localized('皮皮鬼'),
        canon_moaning_myrtle:
            localized(
                '哭泣的桃金娘',
                ['桃金娘'],
            ),
        canon_the_fat_lady:
            localized('胖夫人'),
        canon_the_bloody_baron:
            localized('血人巴罗'),
        canon_aragog:
            localized('阿拉戈克'),
        canon_buckbeak:
            localized('巴克比克'),
        canon_hedwig:
            localized('海德薇'),
        canon_crookshanks:
            localized('克鲁克山'),
        canon_trevor:
            localized('莱福'),
        canon_fang:
            localized('牙牙'),
        canon_fawkes:
            localized('福克斯'),
        canon_fluffy:
            localized('路威'),
        canon_scabbers:
            localized('斑斑'),
        canon_mrs_norris:
            localized('洛丽丝夫人'),
    });

// Only confirmed duplicate rows are redirected. Similar names belonging to
// different generations, such as James Potter and James Sirius Potter, remain
// separate identities.
export const CANON_IDENTITY_REDIRECTS =
    Object.freeze({
        canon_albus_percival_wulfric_brian_dumbledore:
            'canon_albus_dumbledore',
        canon_bill_william_arthur_weasley:
            'canon_bill_weasley',
        canon_charles_weasley:
            'canon_charlie_weasley',
        canon_dolores_jane_umbridge:
            'canon_dolores_umbridge',
        canon_fleur_isabelle_delacour:
            'canon_fleur_delacour',
        canon_fulbert_the_fearful_2:
            'canon_fulbert_the_fearful',
        canon_hector_dagworth_granger_2:
            'canon_hector_dagworth_granger',
        canon_horace_eugene_flaccus_slughorn:
            'canon_horace_slughorn',
        canon_lily_j_potter:
            'canon_lily_potter',
        canon_percy_weasley:
            'canon_percy_ignatius_weasley',
        canon_regulus_black:
            'canon_regulus_arcturus_black',
        canon_sybill_patricia_trelawney:
            'canon_sybill_trelawney',
    });

export function getCanonLocalizationZhCn(
    actorId,
) {
    const canonicalId =
        CANON_IDENTITY_REDIRECTS[
            actorId
        ] || actorId;
    return CANON_LOCALIZATION_ZH_CN[
        canonicalId
    ] || null;
}

export function getCanonicalCanonActorId(
    actorId,
) {
    let current = String(
        actorId || '',
    );
    const visited = new Set();
    while (
        CANON_IDENTITY_REDIRECTS[
            current
        ] &&
        !visited.has(current)
    ) {
        visited.add(current);
        current =
            CANON_IDENTITY_REDIRECTS[
                current
            ];
    }
    return current;
}
