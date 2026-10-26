#!/usr/bin/env bash
# Holds a PR at draft until /pr-review:review has run on it in this session.
# PreToolUse: denies marking a PR ready (or opening one non-draft) until then.
# PostToolUse on Skill and UserPromptSubmit: record each PR the review ran on.
# Fails open: no jq, odd input or GitHub Actions (claude-review.yml reviews
# there) all let the call through.
[ -n "$GITHUB_ACTIONS" ] && exit 0
command -v jq > /dev/null || exit 0

input=$(cat)
field() { jq -r "($1) | select(. != null)" <<< "$input" 2> /dev/null; }

session=$(field .session_id)
[ -n "$session" ] || exit 0
dir="${TMPDIR:-/tmp}/pr-review-gate"
log="$dir/${session//[^A-Za-z0-9_-]/_}"

# The PR number from a review argument: 42, #42, owner/repo/pull/42 or a URL.
pr_from() { grep -oE '[0-9]+[^0-9]*$' <<< "$1" | grep -oE '^[0-9]+'; }

record() {
  [ -n "$1" ] || return 0
  mkdir -p "$dir" && echo "$1" >> "$log"
}

reviewed() { [ -f "$log" ] && grep -qx "$1" "$log"; }

deny() {
  jq -n --arg r "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse",
    permissionDecision: "deny", permissionDecisionReason: $r}}'
  exit 0
}

review_first() {
  deny "PR #$1 hasn't been reviewed in this session yet. Run /pr-review:review $1 \
(print only, no --comment), fix every 🔴 and 🟡 finding it reports and push, then \
mark the PR ready again. Only if the user explicitly said to skip the review for \
this PR, record that with: echo $1 >> '$log'"
}

open_as_draft() {
  deny "Open the PR as a draft, run /pr-review:review on it (print only), fix every \
🔴 and 🟡 finding and push, then mark it ready."
}

case "$(field .hook_event_name)" in
  UserPromptSubmit)
    prompt=$(field .prompt)
    [[ $prompt =~ ^[[:space:]]*/pr-review:review([[:space:]]|$) ]] &&
      record "$(pr_from "$(head -n 1 <<< "$prompt")")"
    ;;
  PostToolUse)
    [[ $(field .tool_input.skill) =~ ^/?pr-review:review$ ]] &&
      record "$(pr_from "$(field .tool_input.args)")"
    ;;
  PreToolUse)
    case "$(field .tool_name)" in
      mcp__github__update_pull_request)
        [ "$(field .tool_input.draft)" = false ] || exit 0
        pr=$(field .tool_input.pullNumber)
        [ -n "$pr" ] && ! reviewed "$pr" && review_first "$pr"
        ;;
      mcp__github__create_pull_request)
        [ "$(field .tool_input.draft)" = true ] || open_as_draft
        ;;
      Bash)
        cmd=$(field .tool_input.command)
        if [[ $cmd =~ gh[[:space:]]+pr[[:space:]]+ready([^;&|]*) ]]; then
          args=${BASH_REMATCH[1]}
          [[ $args =~ --undo ]] && exit 0
          pr=$(grep -oE '(^|[[:space:]])(#?[0-9]+|[^[:space:]]*/pull/[0-9]+)([[:space:]]|$)' <<< "$args" | head -n 1)
          pr=$(pr_from "$pr")
          [ -z "$pr" ] && deny "Name the PR in 'gh pr ready <number>' so the review check can find it."
          reviewed "$pr" || review_first "$pr"
        elif [[ $cmd =~ gh[[:space:]]+pr[[:space:]]+create ]] && ! [[ $cmd =~ --draft|[[:space:]]-d([[:space:]]|$) ]]; then
          open_as_draft
        elif [[ $cmd =~ gh[[:space:]]+api ]]; then
          # REST: POST pulls/<n>/ccr/ready_for_review, PATCH pulls/<n> draft=false,
          # or POST pulls (a title field) without draft=true.
          if [[ $cmd =~ pulls/([0-9]+)/([a-z]+/)?ready_for_review ]] ||
            { [[ $cmd =~ draft=false ]] && [[ $cmd =~ pulls/([0-9]+) ]]; }; then
            reviewed "${BASH_REMATCH[1]}" || review_first "${BASH_REMATCH[1]}"
          elif [[ $cmd =~ /pulls([[:space:]\'\"]|$) ]] && [[ $cmd =~ title= ]] && ! [[ $cmd =~ draft=true ]]; then
            open_as_draft
          fi
        fi
        ;;
    esac
    ;;
esac
exit 0
