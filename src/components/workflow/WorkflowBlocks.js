import {
  Shield,
  FileText,
  MessageSquare,
  Heart,
  Clock,
  GitBranch,
  Circle,
  Reply,
  Share2,
  Image,
  Video,
  Music,
  ThumbsUp,
  UserPlus,
  Send,
  Hash,
  Search,
  Bell,
  Bookmark,
  Eye,
} from 'lucide-react';

/**
 * Each block type defines: type id, label, icon, color, category,
 * and the config fields that appear in the node editor.
 */

const COMMON_BLOCKS = [
  {
    type: 'authenticate',
    label: 'Authenticate',
    icon: Shield,
    color: '#4f46e5',
    category: 'control',
    isRoot: true,
    fields: [
      { key: 'method', label: 'Auth Method', type: 'select', options: ['OAuth2', 'App Key', 'Session Cookie'] },
      { key: 'accountHandle', label: 'Account Handle', type: 'text', placeholder: '@yourig_handle' },
    ],
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: GitBranch,
    color: '#7c3aed',
    category: 'logic',
    hasBranches: true,
    fields: [
      { key: 'metric', label: 'Check Metric', type: 'select', options: ['Likes', 'Comments', 'Shares', 'Views', 'Followers', 'Time Elapsed'] },
      { key: 'operator', label: 'Operator', type: 'select', options: ['>', '<', '>=', '<=', '=='] },
      { key: 'value', label: 'Value', type: 'number', placeholder: '200' },
    ],
  },
  {
    type: 'wait',
    label: 'Wait Timer',
    icon: Clock,
    color: '#f59e0b',
    category: 'control',
    fields: [
      { key: 'duration', label: 'Wait Duration', type: 'select', options: ['5 Minutes', '15 Minutes', '30 Minutes', '1 Hour', '2 Hours', '6 Hours', '12 Hours', '24 Hours'] },
    ],
  },
  {
    type: 'end',
    label: 'End',
    icon: Circle,
    color: '#ef4444',
    category: 'control',
    isTerminal: true,
    fields: [],
  },
];

const PLATFORM_BLOCKS = {
  instagram: [
    {
      type: 'post',
      label: 'Post Automator',
      icon: Image,
      color: '#E4405F',
      category: 'action',
      fields: [
        { key: 'title', label: 'Title', type: 'text', placeholder: 'New Roast Announcement!' },
        { key: 'scheduledTime', label: 'Scheduled Time', type: 'datetime' },
        { key: 'content', label: 'Post Content Source', type: 'textarea', placeholder: 'Enter post caption...' },
        { key: 'media', label: 'Media Upload', type: 'media' },
      ],
    },
    {
      type: 'auto-comment',
      label: 'Auto-Comment',
      icon: MessageSquare,
      color: '#E4405F',
      category: 'action',
      fields: [
        { key: 'commentText', label: 'Comment Text', type: 'textarea', placeholder: 'Thanks for the love, everyone!' },
        { key: 'pinComment', label: 'Pin Comment', type: 'toggle' },
      ],
    },
    {
      type: 'auto-like',
      label: 'Auto-Like',
      icon: Heart,
      color: '#E4405F',
      category: 'action',
      fields: [
        { key: 'target', label: 'Target', type: 'select', options: ['Comments', 'Posts by Tag', 'Posts by User', 'Followers Posts'] },
        { key: 'keywords', label: 'Positive Keywords', type: 'text', placeholder: 'love, amazing, perfect, brew' },
      ],
    },
    {
      type: 'auto-reply',
      label: 'Auto-Reply',
      icon: Reply,
      color: '#E4405F',
      category: 'action',
      fields: [
        { key: 'keywords', label: 'Trigger Keywords', type: 'text', placeholder: '"link", "delivery", "blueberry"' },
        { key: 'response', label: 'Response', type: 'textarea', placeholder: 'Hey there! Yes, we ship nationwide...' },
      ],
    },
    {
      type: 'auto-follow',
      label: 'Auto-Follow',
      icon: UserPlus,
      color: '#E4405F',
      category: 'action',
      fields: [
        { key: 'source', label: 'Source', type: 'select', options: ['Post Likers', 'Commenters', 'Hashtag Followers', 'Competitor Followers'] },
        { key: 'limit', label: 'Daily Limit', type: 'number', placeholder: '50' },
      ],
    },
  ],
  facebook: [
    {
      type: 'post',
      label: 'Post Automator',
      icon: FileText,
      color: '#1877F2',
      category: 'action',
      fields: [
        { key: 'title', label: 'Title', type: 'text', placeholder: 'Post title...' },
        { key: 'scheduledTime', label: 'Scheduled Time', type: 'datetime' },
        { key: 'content', label: 'Post Content', type: 'textarea', placeholder: 'Enter post content...' },
        { key: 'media', label: 'Media Upload', type: 'media' },
      ],
    },
    {
      type: 'auto-comment',
      label: 'Auto-Comment',
      icon: MessageSquare,
      color: '#1877F2',
      category: 'action',
      fields: [
        { key: 'commentText', label: 'Comment Text', type: 'textarea', placeholder: 'Comment text...' },
      ],
    },
    {
      type: 'auto-like',
      label: 'Auto-Like',
      icon: ThumbsUp,
      color: '#1877F2',
      category: 'action',
      fields: [
        { key: 'target', label: 'Target', type: 'select', options: ['Comments', 'Page Posts', 'Group Posts'] },
        { key: 'keywords', label: 'Keywords', type: 'text', placeholder: 'great, awesome...' },
      ],
    },
    {
      type: 'auto-reply',
      label: 'Auto-Reply',
      icon: Reply,
      color: '#1877F2',
      category: 'action',
      fields: [
        { key: 'keywords', label: 'Trigger Keywords', type: 'text', placeholder: '"price", "shipping"' },
        { key: 'response', label: 'Response', type: 'textarea', placeholder: 'Auto response...' },
      ],
    },
    {
      type: 'share',
      label: 'Auto-Share',
      icon: Share2,
      color: '#1877F2',
      category: 'action',
      fields: [
        { key: 'target', label: 'Share To', type: 'select', options: ['Timeline', 'Group', 'Page'] },
        { key: 'caption', label: 'Caption', type: 'text', placeholder: 'Check this out!' },
      ],
    },
  ],
  x: [
    {
      type: 'post',
      label: 'Post Automator',
      icon: Send,
      color: '#000000',
      category: 'action',
      fields: [
        { key: 'content', label: 'Tweet Content', type: 'textarea', placeholder: 'What\'s happening?' },
        { key: 'scheduledTime', label: 'Scheduled Time', type: 'datetime' },
        { key: 'media', label: 'Media', type: 'media' },
      ],
    },
    {
      type: 'auto-reply',
      label: 'Auto-Reply',
      icon: Reply,
      color: '#000000',
      category: 'action',
      fields: [
        { key: 'keywords', label: 'Trigger Keywords', type: 'text', placeholder: '"help", "question"' },
        { key: 'response', label: 'Response', type: 'textarea', placeholder: 'Thanks for reaching out...' },
      ],
    },
    {
      type: 'auto-like',
      label: 'Auto-Like',
      icon: Heart,
      color: '#000000',
      category: 'action',
      fields: [
        { key: 'target', label: 'Target', type: 'select', options: ['Mentions', 'Hashtag', 'Timeline'] },
        { key: 'keywords', label: 'Keywords', type: 'text', placeholder: 'keyword1, keyword2' },
      ],
    },
    {
      type: 'auto-retweet',
      label: 'Auto-Repost',
      icon: Share2,
      color: '#000000',
      category: 'action',
      fields: [
        { key: 'source', label: 'Source', type: 'select', options: ['Mentions', 'Hashtag', 'Specific User'] },
        { key: 'keywords', label: 'Filter Keywords', type: 'text', placeholder: 'filter terms...' },
      ],
    },
  ],
  linkedin: [
    {
      type: 'post',
      label: 'Post Automator',
      icon: FileText,
      color: '#0A66C2',
      category: 'action',
      fields: [
        { key: 'content', label: 'Post Content', type: 'textarea', placeholder: 'Share your thoughts...' },
        { key: 'scheduledTime', label: 'Scheduled Time', type: 'datetime' },
        { key: 'media', label: 'Media', type: 'media' },
      ],
    },
    {
      type: 'auto-comment',
      label: 'Auto-Comment',
      icon: MessageSquare,
      color: '#0A66C2',
      category: 'action',
      fields: [
        { key: 'commentText', label: 'Comment', type: 'textarea', placeholder: 'Great insight!' },
      ],
    },
    {
      type: 'auto-like',
      label: 'Auto-Like',
      icon: ThumbsUp,
      color: '#0A66C2',
      category: 'action',
      fields: [
        { key: 'target', label: 'Target', type: 'select', options: ['Feed Posts', 'Connection Posts', 'Company Posts'] },
      ],
    },
    {
      type: 'auto-connect',
      label: 'Auto-Connect',
      icon: UserPlus,
      color: '#0A66C2',
      category: 'action',
      fields: [
        { key: 'source', label: 'Source', type: 'select', options: ['Post Viewers', 'Company Employees', 'Search Results'] },
        { key: 'message', label: 'Connection Note', type: 'textarea', placeholder: 'Hi, I\'d love to connect...' },
        { key: 'limit', label: 'Daily Limit', type: 'number', placeholder: '25' },
      ],
    },
  ],
  youtube: [
    {
      type: 'post',
      label: 'Video Publisher',
      icon: Video,
      color: '#FF0000',
      category: 'action',
      fields: [
        { key: 'title', label: 'Video Title', type: 'text', placeholder: 'My Awesome Video' },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Video description...' },
        { key: 'scheduledTime', label: 'Scheduled Time', type: 'datetime' },
        { key: 'tags', label: 'Tags', type: 'text', placeholder: 'tag1, tag2, tag3' },
        { key: 'media', label: 'Thumbnail', type: 'media' },
      ],
    },
    {
      type: 'auto-comment',
      label: 'Auto-Comment',
      icon: MessageSquare,
      color: '#FF0000',
      category: 'action',
      fields: [
        { key: 'commentText', label: 'Comment', type: 'textarea', placeholder: 'Thanks for watching!' },
        { key: 'pinComment', label: 'Pin Comment', type: 'toggle' },
      ],
    },
    {
      type: 'auto-reply',
      label: 'Auto-Reply',
      icon: Reply,
      color: '#FF0000',
      category: 'action',
      fields: [
        { key: 'keywords', label: 'Trigger Keywords', type: 'text', placeholder: '"subscribe", "link", "price"' },
        { key: 'response', label: 'Response', type: 'textarea', placeholder: 'Thanks for your comment...' },
      ],
    },
    {
      type: 'auto-like',
      label: 'Auto-Like',
      icon: Heart,
      color: '#FF0000',
      category: 'action',
      fields: [
        { key: 'target', label: 'Target', type: 'select', options: ['Comments', 'Subscriber Videos'] },
        { key: 'keywords', label: 'Keywords', type: 'text', placeholder: 'great, love, amazing' },
      ],
    },
    {
      type: 'auto-subscribe',
      label: 'Auto-Subscribe',
      icon: Bell,
      color: '#FF0000',
      category: 'action',
      fields: [
        { key: 'source', label: 'Source', type: 'select', options: ['Commenters', 'Similar Channels', 'Search Results'] },
        { key: 'limit', label: 'Daily Limit', type: 'number', placeholder: '30' },
      ],
    },
  ],
  reddit: [
    {
      type: 'post',
      label: 'Post Automator',
      icon: FileText,
      color: '#FF4500',
      category: 'action',
      fields: [
        { key: 'subreddit', label: 'Subreddit', type: 'text', placeholder: 'r/subreddit' },
        { key: 'title', label: 'Post Title', type: 'text', placeholder: 'Post title' },
        { key: 'content', label: 'Post Content', type: 'textarea', placeholder: 'Post body...' },
        { key: 'scheduledTime', label: 'Scheduled Time', type: 'datetime' },
      ],
    },
    {
      type: 'auto-comment',
      label: 'Auto-Comment',
      icon: MessageSquare,
      color: '#FF4500',
      category: 'action',
      fields: [
        { key: 'commentText', label: 'Comment', type: 'textarea', placeholder: 'Comment text...' },
      ],
    },
    {
      type: 'auto-upvote',
      label: 'Auto-Upvote',
      icon: ThumbsUp,
      color: '#FF4500',
      category: 'action',
      fields: [
        { key: 'target', label: 'Target', type: 'select', options: ['Comments on My Posts', 'Posts by Keyword'] },
        { key: 'keywords', label: 'Keywords', type: 'text', placeholder: 'helpful keywords' },
      ],
    },
  ],
  snapchat: [
    {
      type: 'post',
      label: 'Story Publisher',
      icon: Image,
      color: '#FFFC00',
      category: 'action',
      fields: [
        { key: 'content', label: 'Story Caption', type: 'textarea', placeholder: 'Story caption...' },
        { key: 'scheduledTime', label: 'Scheduled Time', type: 'datetime' },
        { key: 'media', label: 'Media', type: 'media' },
      ],
    },
    {
      type: 'auto-reply',
      label: 'Auto-Reply',
      icon: Reply,
      color: '#FFFC00',
      category: 'action',
      fields: [
        { key: 'keywords', label: 'Trigger Keywords', type: 'text', placeholder: '"hey", "sup"' },
        { key: 'response', label: 'Response', type: 'textarea', placeholder: 'Auto reply...' },
      ],
    },
  ],
  spotify: [
    {
      type: 'post',
      label: 'Playlist Manager',
      icon: Music,
      color: '#1DB954',
      category: 'action',
      fields: [
        { key: 'playlistName', label: 'Playlist Name', type: 'text', placeholder: 'My Playlist' },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Playlist description...' },
        { key: 'scheduledTime', label: 'Scheduled Time', type: 'datetime' },
      ],
    },
    {
      type: 'auto-like',
      label: 'Auto-Save',
      icon: Bookmark,
      color: '#1DB954',
      category: 'action',
      fields: [
        { key: 'target', label: 'Target', type: 'select', options: ['New Releases', 'By Genre', 'By Artist'] },
        { key: 'genre', label: 'Genre Filter', type: 'text', placeholder: 'hip-hop, jazz' },
      ],
    },
  ],
};

export function getBlocksForPlatform(platformKey) {
  const platformSpecific = PLATFORM_BLOCKS[platformKey] || [];
  return [...COMMON_BLOCKS, ...platformSpecific];
}

export function getBlockDefinition(platformKey, blockType) {
  const allBlocks = getBlocksForPlatform(platformKey);
  return allBlocks.find((b) => b.type === blockType);
}
