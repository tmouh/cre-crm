import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderOpen, FileText, Search, ExternalLink, Clock,
  HardDrive, Share2, Globe, RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'
import { useMicrosoft } from '../context/MicrosoftContext'
import { formatDate } from '../utils/helpers'
import * as msService from '../services/microsoft'

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(name) {
  if (!name) return FileText
  const ext = name.split('.').pop()?.toLowerCase()
  // All file types get same icon for simplicity; could expand later
  return FileText
}

export default function Documents() {
  const { isConnected, recentFiles } = useMicrosoft()
  const [activeTab, setActiveTab] = useState('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [sharedFiles, setSharedFiles] = useState([])
  const [sharePointSites, setSharePointSites] = useState([])
  const [loadingShared, setLoadingShared] = useState(false)

  // Load shared files and SharePoint sites
  useEffect(() => {
    if (isConnected && activeTab === 'shared' && sharedFiles.length === 0) {
      setLoadingShared(true)
      msService.getSharedFiles(25).then(setSharedFiles).finally(() => setLoadingShared(false))
    }
    if (isConnected && activeTab === 'sharepoint' && sharePointSites.length === 0) {
      msService.getSharePointSites().then(setSharePointSites)
    }
  }, [isConnected, activeTab]) // eslint-disable-line

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    const results = await msService.searchFiles(searchQuery, 25)
    setSearchResults(results)
    setSearching(false)
    setActiveTab('search')
  }

  if (!isConnected) {
    return (
      <div className="p-6 max-w-[800px] mx-auto animate-fade-in">
        <div className="v-card p-8 text-center">
          <FolderOpen size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Connect Microsoft 365</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            Connect your Microsoft account to browse OneDrive files, SharePoint sites, and shared documents directly in Vanadium OS.
          </p>
          <Link to="/settings" className="v-btn-primary mt-4">Connect Microsoft 365</Link>
        </div>
      </div>
    )
  }

  const displayFiles = activeTab === 'search' ? searchResults : activeTab === 'shared' ? sharedFiles : recentFiles

  return (
    <div className="p-6 max-w-[1000px] mx-auto animate-fade-in">
      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search files in OneDrive..."
            className="v-input pl-8"
          />
        </div>
        <button onClick={handleSearch} disabled={searching} className="v-btn-secondary">
          {searching ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
          Search
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-slate-200 dark:border-slate-700/40">
        {[
          { id: 'recent', label: 'Recent', icon: Clock },
          { id: 'shared', label: 'Shared with me', icon: Share2 },
          { id: 'sharepoint', label: 'SharePoint', icon: Globe },
          ...(searchResults.length > 0 ? [{ id: 'search', label: `Results (${searchResults.length})`, icon: Search }] : []),
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            )}
          >
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

      {/* SharePoint sites view */}
      {activeTab === 'sharepoint' ? (
        <div className="space-y-1">
          {sharePointSites.length === 0 ? (
            <div className="v-card p-8 text-center">
              <Globe size={20} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 dark:text-slate-500">No SharePoint sites found</p>
            </div>
          ) : sharePointSites.map(site => (
            <a key={site.id} href={site.webUrl} target="_blank" rel="noopener noreferrer"
              className="v-card p-3 flex items-center gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
              <Globe size={16} className="text-brand-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{site.displayName}</p>
                {site.description && <p className="text-2xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{site.description}</p>}
              </div>
              <ExternalLink size={12} className="text-slate-400 flex-shrink-0" />
            </a>
          ))}
        </div>
      ) : (
        /* File list */
        <div className="space-y-1">
          {(loadingShared && activeTab === 'shared') ? (
            <div className="v-card p-8 text-center">
              <RefreshCw size={16} className="text-slate-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading...</p>
            </div>
          ) : displayFiles.length === 0 ? (
            <div className="v-card p-8 text-center">
              <FolderOpen size={20} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {activeTab === 'search' ? 'No files match your search' : 'No files found'}
              </p>
            </div>
          ) : displayFiles.map(file => {
            const Icon = fileIcon(file.name)
            return (
              <a key={file.id} href={file.webUrl} target="_blank" rel="noopener noreferrer"
                className="v-card p-3 flex items-center gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <Icon size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-2xs text-slate-400 dark:text-slate-500">
                    {file.lastModifiedDateTime && <span>{formatDate(file.lastModifiedDateTime)}</span>}
                    {file.size && <span>· {formatFileSize(file.size)}</span>}
                    {file.lastModifiedBy?.user?.displayName && <span>· {file.lastModifiedBy.user.displayName}</span>}
                  </div>
                </div>
                <ExternalLink size={12} className="text-slate-400 flex-shrink-0" />
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
