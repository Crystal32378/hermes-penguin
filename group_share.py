"""Offline routing plans for the EXISTING Penguin proposal/share card.

No voting UI, candidate finder, reply collector, bot registration, SDK send,
HTTP call, credential loading, or upload occurs here. Real delivery is disabled.
"""
from __future__ import annotations

from hashlib import sha256
import json
import re
from uuid import UUID

from .core import keys, preview, _handoff_relay


class SharePlanError(ValueError):
    pass


def selection_fingerprint(selection):
    """Recompute the selected slot using the existing engine, never find new slots."""
    slot = preview(selection)
    return sha256(json.dumps(slot, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def existing_proposal_text(selection):
    """Exact mirror of current desktop proposal(slot) + copy() warning.

    Tested against the actual JavaScript function. This is not a new card design.
    The actual existing UI text must be supplied and match before planning.
    """
    slot = preview(selection)
    lines = ["Meeting proposal · Penguin", f"{slot['elapsed_minutes']} minutes · {slot['start_utc']} → {slot['end_utc']}"]
    lines += [f"{m['name']}: {m['start']['local']} → {m['end']['local']} ({m['start']['zone']})" for m in slot["members"]]
    lines.append("Please confirm availability. No calendar event has been created.")
    if not slot["all_available"]:
        lines.append("Note: this time is outside at least one member’s work hours.")
    return "\n".join(lines)


def _snowflake(value):
    if not isinstance(value, str) or not re.fullmatch(r"[1-9][0-9]{16,19}", value):
        raise SharePlanError("Use a verified Discord numeric ID, not a channel name or invitation link.")
    return value


def _slack_id(value, prefix):
    if not isinstance(value, str) or not re.fullmatch("[" + prefix + "][A-Z0-9]{8,20}", value):
        raise SharePlanError("Use an exact Slack workspace/channel ID, not a name, user ID or invitation link.")
    return value


def reject_slack_mentions(content):
    # Preserve existing copy exactly; reject active markup instead of rewriting it.
    if re.search(r"<(?:@|!|#)|(?<![A-Za-z0-9_])@(?:everyone|channel|here)\b", content, re.I):
        raise SharePlanError("Proposal contains Slack mention syntax. Review names/text before preparing a no-ping share.")


def _target(target):
    if not isinstance(target, dict):
        raise SharePlanError("An explicit destination is required.")
    platform = target.get("platform")
    if platform == "discord":
        keys(target, ("platform", "guild_id", "channel_id", "thread_id"), ("platform", "guild_id", "channel_id"))
        result = {"platform": platform, "guild_id": _snowflake(target["guild_id"]), "channel_id": _snowflake(target["channel_id"])}
        if "thread_id" in target:
            result["thread_id"] = _snowflake(target["thread_id"])
    elif platform == "slack":
        keys(target, ("platform", "workspace_id", "channel_id", "thread_ts"), ("platform", "workspace_id", "channel_id"))
        result = {"platform": platform, "workspace_id": _slack_id(target["workspace_id"], "T"),
                  "channel_id": _slack_id(target["channel_id"], "CG")}
        if "thread_ts" in target:
            if not isinstance(target["thread_ts"], str) or not re.fullmatch(r"[0-9]{10,16}\.[0-9]{6}", target["thread_ts"]):
                raise SharePlanError("Use the exact Slack parent-message timestamp for a thread.")
            result["thread_ts"] = target["thread_ts"]
    elif platform == "buzz":
        keys(target, ("platform", "relay_url", "channel_id", "thread_root_id"), ("platform", "relay_url", "channel_id"))
        try:
            channel = target["channel_id"]
            if not isinstance(channel, str) or str(UUID(channel)) != channel.lower():
                raise ValueError("Invalid UUID")
        except (ValueError, TypeError, AttributeError) as exc:
            raise SharePlanError("Use the exact Buzz channel UUID.") from exc
        result = {"platform": platform, "relay_url": _handoff_relay(target["relay_url"]), "channel_id": channel.lower()}
        if "thread_root_id" in target:
            root = target["thread_root_id"]
            if not isinstance(root, str) or not re.fullmatch(r"[a-f0-9]{64}", root):
                raise SharePlanError("Use a verified Buzz thread-root event ID.")
            result["thread_root_id"] = root
    else:
        raise SharePlanError("Only Slack, Buzz or Discord group destinations are supported by this offline plan.")
    result["verified"] = False
    return result


def plan_existing_card_share(*, selection, copied_proposal, target, expected_selection_fingerprint, exported_png=None, export_selection_fingerprint=None):
    current = selection_fingerprint(selection)
    if current != expected_selection_fingerprint:
        raise SharePlanError("Selected time changed; recapture and review the current proposal.")
    if copied_proposal != existing_proposal_text(selection):
        raise SharePlanError("Proposal text is stale or differs from the existing Penguin card.")
    destination = _target(target)
    if destination["platform"] == "discord" and len(copied_proposal) > 2000:
        raise SharePlanError("Existing proposal exceeds the single Discord message limit; review a delivery format rather than truncating it.")
    if destination["platform"] == "slack":
        reject_slack_mentions(copied_proposal)
        if len(copied_proposal) > 4000:
            raise SharePlanError("Existing proposal exceeds this prototype's 4,000-character Slack cap; review the format rather than truncating it.")
    attachment = None
    if exported_png is not None:
        if export_selection_fingerprint != current:
            raise SharePlanError("Exported image belongs to another or unrecorded selection.")
        if not isinstance(exported_png, bytes) or not exported_png.startswith(b"\x89PNG\r\n\x1a\n") or not 8 < len(exported_png) <= 8 * 1024 * 1024:
            raise SharePlanError("Supply an existing-card PNG export below this prototype's 8 MiB cap.")
        attachment = {"source_component": "existing SendOff", "mime_type": "image/png", "filename": "penguin-meeting-proposal.png",
                      "sha256": sha256(exported_png).hexdigest(), "bytes": len(exported_png),
                      "selection_fingerprint": current, "visual_provenance_verified": False}
    result = {"mode": "offline_share_draft", "sent": False, "approved": False, "live_transport_available": False,
              "destination": destination, "selection_fingerprint": current,
              "content": copied_proposal, "attachment": attachment, "new_card_design": False,
              "requires_organizer_review": True, "message_id": None, "permalink": None,
              "discussion": "People discuss and confirm externally; this module neither reads nor tallies responses.",
              "next_step": "After group discussion, organizer supplies attendee emails and reviews the separate Calendar invitation."}
    if destination["platform"] == "discord":
        result["mention_policy"] = {"parse": [], "replied_user": False}
        result["requires_before_send"] = ["Verify bot identity, server membership and exact channel/thread relationship.",
            "Verify View Channel, Send Messages and Attach Files permissions; Send Messages in Threads if needed.",
            "Review the existing card image and caption together; never infer permission to install into the official Hermes server."]
    elif destination["platform"] == "slack":
        result["mention_policy"] = {"parse": "none", "link_names": False, "mrkdwn": False,
                                    "active_mention_syntax_rejected": True}
        result["required_scopes"] = ["files:write"] if attachment else ["chat:write"]
        result["requires_before_send"] = ["Verify dedicated bot identity, target workspace and membership in this exact private/public channel.",
            "Verify this exact parent thread when supplied; a channel name or user membership is not bot access.",
            "Review the existing PNG and full caption together. Obtain approval for the exact destination and data.",
            "Use only reviewed chat:write/files:write access; no history, DM, app install or credential operations are implemented."]
    else:
        result["requires_before_send"] = ["Verify community, dedicated bot identity, channel membership and thread root.",
            "Review any mention text and upload permission; do not infer recipients from display names.",
            "Use the supported native Buzz attachment operation/CLI; never interpolate content into a shell."]
    if attachment is None:
        result["requires_before_send"].append("For image sharing, export the existing SendOff card; no image has been captured by this plan.")
    encoded = json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    result["review_digest"] = sha256(encoded.encode()).hexdigest()
    return result


def send_existing_card(*args, **kwargs):
    raise SharePlanError("Live group sending/upload is not implemented or authorized in this prototype.")
