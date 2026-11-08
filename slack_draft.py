"""Offline Slack Web API plan. No SDK client, token, file upload or send exists.

Only the already selected Penguin card/caption is carried forward. This is not
Slack installation, Hermes gateway activation, ChatGPT app setup or OAuth.
"""
from copy import deepcopy
from hashlib import sha256
import json
import re

from .group_share import SharePlanError, plan_existing_card_share
from .core import keys

FEATURE_SCOPE_PROPOSAL = ('chat:write', 'files:write')


def _digest(value):
    return sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def plan_slack_delivery(*, export_manifest=None, **share_args):
    draft = plan_existing_card_share(**share_args)
    target = draft['destination']
    if target['platform'] != 'slack':
        raise SharePlanError('This adapter only prepares Slack delivery.')
    if export_manifest is not None:
        if draft['attachment'] is not None:
            raise SharePlanError('Choose a byte-backed export or a metadata-only candidate, not both.')
        keys(export_manifest, ('selection', 'sha256', 'bytes', 'width', 'height'), ('selection', 'sha256', 'bytes', 'width', 'height'))
        if export_manifest['selection'] != share_args['selection']:
            raise SharePlanError('The candidate image belongs to a different selected time.')
        if not isinstance(export_manifest['sha256'], str) or not re.fullmatch(r'[a-f0-9]{64}', export_manifest['sha256']):
            raise SharePlanError('Candidate image needs its exact SHA-256 digest.')
        size, width, height = (export_manifest[k] for k in ('bytes', 'width', 'height'))
        if any(type(n) is not int for n in (size, width, height)) or not 8 < size <= 8*1024*1024 or not 0 < width <= 2048 or not 0 < height <= 4096 or width*height > 6000000:
            raise SharePlanError('Candidate image metadata exceeds this prototype’s export limits.')
        draft['attachment'] = {'source_component': 'existing SendOff', 'mime_type': 'image/png', 'filename': 'penguin-meeting-proposal.png',
            'sha256': export_manifest['sha256'], 'bytes': size, 'width': width, 'height': height,
            'selection_fingerprint': draft['selection_fingerprint'], 'visual_provenance_verified': False,
            'bytes_received_by_gateway': False, 'bytes_integrity_verified': False, 'candidate_metadata_only': True}
        draft['required_scopes'] = ['files:write']
        draft['requires_before_send'] = [line for line in draft['requires_before_send'] if not line.startswith('For image sharing,')]
        draft['requires_before_send'].append('Recompute this image hash from the actual bytes, decode the PNG and verify its visual content before any future upload.')
        draft.pop('review_digest', None)
        draft['review_digest'] = _digest(draft)
    destination = {k: v for k, v in target.items() if k != 'verified'}
    thread = {'thread_ts': target['thread_ts']} if 'thread_ts' in target else {}
    if draft['attachment'] is None:
        required_scopes = ['chat:write']
        steps = [{'id': 'post_text', 'method': 'chat.postMessage', 'executed': False,
                  'arguments': {'channel': target['channel_id'], **thread, 'text': draft['content'],
                                'mrkdwn': False, 'parse': 'none', 'link_names': False,
                                'unfurl_links': False, 'unfurl_media': False}}]
    else:
        # initial_comment carries the SAME caption with the image. No duplicate
        # post_text step, no parallel upload, and no deprecated files.upload.
        required_scopes = ['files:write']
        image = draft['attachment']
        steps = [
            {'id': 'obtain_upload', 'method': 'files.getUploadURLExternal', 'executed': False,
             'arguments': {'filename': image['filename'], 'length': image['bytes']}},
            {'id': 'upload_reviewed_bytes', 'operation': 'upload_exact_reviewed_bytes', 'executed': False,
             'provider_upload_url_available': False, 'url_from_step': 'obtain_upload.upload_url',
             'sha256': image['sha256'], 'bytes': image['bytes'],
             'requires': 'Use only the upload URL returned by the authenticated Slack request; no caller-supplied endpoint.'},
            {'id': 'complete_upload', 'method': 'files.completeUploadExternal', 'executed': False,
             'arguments_template': {'files': [{'id_from_step': 'obtain_upload.file_id', 'title': 'Penguin meeting proposal'}],
                                    'channel_id': target['channel_id'], **thread, 'initial_comment': draft['content']},
             'provider_file_id_available': False},
        ]
    result = {
        'mode': 'offline_slack_delivery_plan', 'sent': False, 'approved': False,
        'live_transport_available': False, 'credentials_accessed': False,
        'actual_grants_verified': False, 'bot_identity_verified': False,
        'channel_membership_verified': False, 'destination': destination,
        'required_scopes': required_scopes, 'feature_scope_proposal': list(FEATURE_SCOPE_PROPOSAL),
        'share_draft': draft, 'steps': steps, 'message_ts': None, 'permalink': None,
        'requires_exact_review': True,
        'before_any_live_operation': [
            'Verify workspace, dedicated bot identity and access to the exact channel/thread.',
            'Obtain any app installation or scope grant approval separately; none is provided here.',
            'Show the exact caption, PNG, channel/thread and data recipients for organizer review.',
            'Bind final action approval to this payload and image digest; an offline fixture receipt is not approval.',
            'For metadata-only images, obtain actual bytes and verify the hash, decoded PNG and selection before any upload.',
            'Use a durable operation journal; inspect ambiguous results before retrying, never double-post.',
        ],
        'no_extra_access': ['No channel/history search', 'No DMs', 'No app install', 'No Socket Mode', 'No calendar access'],
    }
    result['plan_digest'] = _digest(result)
    return result


def record_fixture_review(plan, *, expected_plan_digest, expected_destination, expected_caption):
    """Test only: prove stale/channel/attachment changes invalidate review.

    Caller-supplied data cannot establish genuine user consent. Even a matching
    receipt has authorized_to_send=False and cannot enable the disabled sender.
    """
    if not isinstance(plan, dict) or plan.get('mode') != 'offline_slack_delivery_plan':
        raise SharePlanError('Expected an offline Slack plan.')
    current = deepcopy(plan)
    stored = current.pop('plan_digest', None)
    if not stored or stored != _digest(current) or expected_plan_digest != stored:
        raise SharePlanError('Slack plan changed; review the exact current payload again.')
    if current['destination'] != expected_destination or current['share_draft']['content'] != expected_caption:
        raise SharePlanError('Reviewed channel or caption does not match this plan.')
    if current.get('sent') or current.get('approved') or current.get('live_transport_available'):
        raise SharePlanError('A fixture review cannot approve a live action.')
    return {'mode': 'fixture_review_receipt', 'plan_digest': stored,
            'acknowledged_for_test': True, 'authorized_to_send': False, 'sent': False}


def send_slack_delivery(*args, **kwargs):
    raise SharePlanError('Live Slack delivery is not implemented or authorized; no token or approval flag can enable it.')
