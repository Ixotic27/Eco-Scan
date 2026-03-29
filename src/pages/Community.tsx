import React, { useState, useEffect } from 'react';
import { Users, ThumbsUp, Loader2, Clock, CheckCircle, Sparkles, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getCommunityFeed, upvoteDIYProject } from '../lib/db';
import { CommunityDIYPost } from '../types';

const Community: React.FC = () => {
  const { user, addPoints, firebaseUser } = useAppContext();
  const [posts, setPosts] = useState<CommunityDIYPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
  }, []);

  const [debugInfo, setDebugInfo] = useState<string>('');

  const loadFeed = async () => {
    setLoading(true);
    setDebugInfo('Fetching...');
    try {
      const feed = await getCommunityFeed();
      setPosts(feed);
      setDebugInfo(`Successfully fetched ${feed.length} posts from communityDIY collection.`);
    } catch (err: any) {
      console.error('Failed to load community feed:', err);
      setDebugInfo(`ERROR: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (postId: string) => {
    if (!user || !firebaseUser) return;
    setVotingId(postId);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await upvoteDIYProject(postId, user.id);
      
      // Update local state
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, upvotes: result.newUpvotes, votedUserIds: [...(p.votedUserIds || []), user.id], ...(result.approved ? { status: 'approved' as const } : {}) }
          : p
      ));

      // If the post got approved (3 upvotes), award points to the creator
      if (result.approved && result.creatorId === user.id) {
        await addPoints(15); // Award DIY points
        setSuccessMsg('🎉 Your project got approved! +15 points earned!');
      } else if (result.approved) {
        setSuccessMsg(`This project just got approved! The creator earned their points.`);
      } else {
        setSuccessMsg(`Upvoted! ${3 - result.newUpvotes} more votes needed for approval.`);
      }
      
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to upvote.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={22} className="text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Community Feed</h1>
        </div>
        <button
          onClick={loadFeed}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm">
        DIY upcycling projects from the community. Upvote projects to help creators earn their points!
        <br />
        <span className="text-indigo-500">Projects need 3 upvotes to be approved.</span>
      </p>

      {/* Status Messages */}
      {debugInfo && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <p className="text-blue-700 dark:text-blue-400 text-xs font-mono">{debugInfo}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl animate-pulse">
          <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
          <p className="text-green-700 dark:text-green-400 text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-20">
          <Loader2 size={32} className="mx-auto mb-3 text-indigo-400 animate-spin" />
          <p className="text-gray-500">Loading community feed...</p>
        </div>
      ) : posts.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Sparkles size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">No DIY projects yet</h3>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            Scan a waste item, choose the DIY verification path, and your project will appear here for community voting!
          </p>
        </div>
      ) : (
        /* Posts Grid */
        <div className="space-y-4">
          {posts.map(post => {
            const hasVoted = post.votedUserIds?.includes(user?.id || '');
            const isVoting = votingId === post.id;
            const isApproved = post.status === 'approved';
            
            return (
              <div
                key={post.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all ${
                  isApproved 
                    ? 'border-green-200 dark:border-green-800' 
                    : 'border-gray-100 dark:border-gray-700'
                }`}
              >
                {/* Post Header */}
                <div className="flex items-center gap-3 p-4 pb-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-indigo-400 to-purple-500 flex-shrink-0">
                    {post.userAvatar ? (
                      <img src={post.userAvatar} alt={post.userName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                        {post.userName?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                      {post.userName}
                      {post.userId === user?.id && <span className="text-indigo-500 text-xs font-normal ml-1">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      Upcycled: <span className="font-medium text-gray-600 dark:text-gray-300">{post.originalMaterial}</span>
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {isApproved ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
                        <CheckCircle size={12} /> Approved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full">
                        <Clock size={12} /> {3 - (post.upvotes || 0)} votes needed
                      </span>
                    )}
                  </div>
                </div>

                {/* Project Images */}
                {post.diyImages && post.diyImages.length > 0 && (
                  <div className={`grid gap-1 px-4 ${post.diyImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {post.diyImages.slice(0, 4).map((img, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900">
                        <img 
                          src={img} 
                          alt={`DIY project angle ${i + 1}`} 
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Materials & Description */}
                <div className="p-4 pt-3">
                  {post.materialsUsed && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Materials used: </span>
                      {post.materialsUsed}
                    </p>
                  )}

                  {/* Upvote Section */}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-50 dark:border-gray-700">
                    <button
                      onClick={() => handleUpvote(post.id)}
                      disabled={hasVoted || isVoting || post.userId === user?.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        hasVoted
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 cursor-default'
                          : post.userId === user?.id
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400'
                      }`}
                    >
                      {isVoting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ThumbsUp size={16} className={hasVoted ? 'fill-current' : ''} />
                      )}
                      {hasVoted ? 'Upvoted' : post.userId === user?.id ? "Can't vote own" : 'Upvote'}
                    </button>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      {post.upvotes || 0} {(post.upvotes || 0) === 1 ? 'vote' : 'votes'}
                    </span>
                    
                    {/* Progress bar to 3 votes */}
                    {!isApproved && (
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ((post.upvotes || 0) / 3) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Community;
