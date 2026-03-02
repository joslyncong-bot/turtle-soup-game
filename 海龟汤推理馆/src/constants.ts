export interface Story {
  id: number;
  riddle: string;
  truth: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'speedrun',
    title: '速通大师',
    description: '在5轮提问内揭开汤底',
    icon: 'Zap'
  },
  {
    id: 'persistent',
    title: '打破砂锅问到底',
    description: '提问超过20次才揭开汤底',
    icon: 'Search'
  },
  {
    id: 'intuition',
    title: '直觉敏锐',
    description: '连续获得3个“是。”的回答',
    icon: 'Lightbulb'
  },
  {
    id: 'offtrack',
    title: '南辕北辙',
    description: '连续获得5个“无关。”或“不是。”的回答',
    icon: 'Compass'
  },
  {
    id: 'collector',
    title: '汤底收藏家',
    description: '累计揭开所有5个故事的汤底',
    icon: 'Trophy'
  },
  {
    id: 'voice_detective',
    title: '语音神探',
    description: '单局游戏中使用语音输入超过5次',
    icon: 'Mic'
  }
];

export const STORIES: Story[] = [
  {
    id: 1,
    riddle: "一个男人走进一家餐厅，点了一碗海龟汤。喝完之后，他走出餐厅，自杀了。为什么？",
    truth: "男人曾和父亲在海上遇险。父亲为了救他，骗他喝下所谓的‘海龟汤’，实际上那是父亲割下自己的肉做的。男人在餐厅喝到真正的海龟汤，发现味道完全不同，意识到当年喝的是父亲的肉，悲痛之下自杀。"
  },
  {
    id: 2,
    riddle: "半夜，小明听到楼下有脚步声，他下楼查看，发现空无一人。第二天，小明死了。为什么？",
    truth: "小明是个盲人，他住在二楼。半夜他听到脚步声是小偷进屋。他下楼查看时，小偷为了不被发现，把楼梯撤走了。小明以为还在走楼梯，结果一脚踩空摔死。"
  },
  {
    id: 3,
    riddle: "一个女人在葬礼上遇到了一个心仪的男人，几天后，她杀死了自己的姐姐。为什么？",
    truth: "女人想再次见到那个男人。她认为既然在葬礼上遇到他，那么只要再举办一次葬礼（杀掉亲人），那个男人就可能再次出现。"
  },
  {
    id: 4,
    riddle: "马戏团里有两个侏儒，其中一个瞎了。一天，瞎了的侏儒自杀了。为什么？",
    truth: "另一个侏儒为了争夺‘世界第一矮’的称号，趁瞎子睡觉时锯短了他的拐杖。瞎子醒来拄拐杖发现自己‘长高’了，以为自己得了怪病会不断长高，失去唯一的生存价值，于是绝望自杀。"
  },
  {
    id: 5,
    riddle: "一个水手在岛上吃了一块肉，觉得很好吃。回到城市后，他去餐厅点了一份同样的肉，吃了一口就吐了，然后自杀了。为什么？",
    truth: "水手曾遭遇海难，在荒岛上，同伴告诉他那是‘企鹅肉’。回到城市吃到真正的企鹅肉，他发现味道完全不同，意识到在岛上吃的是遇难同伴的肉。"
  }
];
