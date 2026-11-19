/** Accessible, owner-scoped learning feedback and review panel for browser apps. */

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function field(labelText, name, rows = 1) {
  const wrapper = element("label", undefined, "xsus-learning-field");
  wrapper.append(element("span", labelText));
  const input = rows > 1 ? element("textarea") : element("input");
  input.name = name;
  input.required = true;
  if (rows > 1) input.rows = rows;
  wrapper.append(input);
  return { wrapper, input };
}

function describeState(status) {
  const labels = {
    waiting_for_feedback: "Waiting for reviewed examples",
    queued_for_learning: "Ready for the next learning cycle",
    training: "Building a candidate model",
    candidate_ready: "Candidate passed the quality gate; human release is required",
    candidate_blocked: "Candidate did not pass the quality gate",
    blocked: "Learning cycle is blocked; review the configuration",
    failed: "The latest learning cycle failed",
  };
  return labels[status] ?? "Learning status is unavailable";
}

/**
 * Mount a consent-first feedback form and personal review queue.
 * The panel never reads a chat or submits it automatically; callers must pass
 * the explicit, user-provided example through the form.
 */
export function mountLearningPanel(container, { client } = {}) {
  if (!container || typeof container.replaceChildren !== "function") {
    throw new TypeError("A DOM container is required");
  }
  if (!client || typeof client.submitFeedback !== "function" ||
      typeof client.getLearningStatus !== "function" ||
      typeof client.listFeedback !== "function") {
    throw new TypeError("A Future XSUS Core browser client is required");
  }

  const root = element("section", undefined, "xsus-learning-panel");
  root.setAttribute("aria-labelledby", "xsus-learning-title");
  const heading = element("h2", "Help improve English responses");
  heading.id = "xsus-learning-title";
  root.append(heading);
  root.append(element(
    "p",
    "Submit only examples you choose to share. They stay private to your account and remain pending until you review them. Candidate models never become active automatically.",
    "xsus-learning-intro",
  ));
  const statusMessage = element("p", "Loading learning status…", "xsus-learning-message");
  statusMessage.setAttribute("role", "status");
  statusMessage.setAttribute("aria-live", "polite");
  root.append(statusMessage);

  const summary = element("dl", undefined, "xsus-learning-summary");
  const stateValue = element("dd", "Loading…");
  const pendingValue = element("dd", "—");
  const acceptedValue = element("dd", "—");
  summary.append(element("dt", "Learning cycle"), stateValue);
  summary.append(element("dt", "Examples awaiting review"), pendingValue);
  summary.append(element("dt", "Approved examples"), acceptedValue);
  root.append(summary);

  const form = element("form", undefined, "xsus-learning-form");
  const prompt = field("User prompt or sentence", "prompt", 3);
  const response = field("Preferred answer or correction", "response", 4);
  const consentLabel = element("label", undefined, "xsus-learning-consent");
  const consent = element("input");
  consent.type = "checkbox";
  consent.required = true;
  consentLabel.append(consent, element(
    "span",
    "I agree to save this example in my private learning-feedback record for model improvement.",
  ));
  const submit = element("button", "Submit example for review");
  submit.type = "submit";
  form.append(prompt.wrapper, response.wrapper, consentLabel, submit);
  root.append(form);

  const queueHeading = element("h3", "Review my submitted examples");
  root.append(queueHeading);
  const queue = element("ol", undefined, "xsus-learning-queue");
  root.append(queue);
  container.replaceChildren(root);

  let destroyed = false;

  function report(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", isError);
  }

  async function refresh() {
    try {
      const [status, feedback] = await Promise.all([
        client.getLearningStatus(),
        client.listFeedback(),
      ]);
      if (destroyed) return;
      stateValue.textContent = describeState(status.status);
      pendingValue.textContent = String(status.pending_examples ?? feedback.pending?.length ?? 0);
      acceptedValue.textContent = `${status.accepted_examples ?? 0} / ${status.minimum_approved_examples ?? 5}`;
      queue.replaceChildren();
      const ids = Array.isArray(feedback.pending) ? feedback.pending : [];
      if (ids.length === 0) {
        queue.append(element("li", "No examples are waiting for your review."));
      }
      const records = await Promise.all(ids.map((id) => client.getFeedback(id)));
      if (destroyed) return;
      for (const record of records) {
        const card = element("li", undefined, "xsus-learning-card");
        const promptBlock = element("p", undefined);
        promptBlock.append(element("strong", "Prompt: "), document.createTextNode(record.prompt));
        const responseBlock = element("p", undefined);
        responseBlock.append(element("strong", "Preferred response: "), document.createTextNode(record.response));
        const actions = element("div", undefined, "xsus-learning-actions");
        for (const [decision, label] of [["accept", "Approve for learning"], ["reject", "Reject example"]]) {
          const button = element("button", label);
          button.type = "button";
          button.addEventListener("click", async () => {
            button.disabled = true;
            try {
              await client.reviewFeedback(record.example_id, decision);
              report(decision === "accept" ? "Example approved." : "Example rejected.");
              await refresh();
            } catch (error) {
              report(error?.message ?? "Could not review this example.", true);
              button.disabled = false;
            }
          });
          actions.append(button);
        }
        const remove = element("button", "Delete example");
        remove.type = "button";
        remove.addEventListener("click", async () => {
          if (!globalThis.confirm("Delete this feedback example permanently?")) return;
          remove.disabled = true;
          try {
            await client.deleteFeedback(record.example_id);
            report("Example deleted.");
            await refresh();
          } catch (error) {
            report(error?.message ?? "Could not delete this example.", true);
            remove.disabled = false;
          }
        });
        actions.append(remove);
        card.append(promptBlock, responseBlock, actions);
        queue.append(card);
      }
    } catch (error) {
      if (!destroyed) report(error?.message ?? "Could not load learning status.", true);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!consent.checked) {
      report("Please give consent before submitting an example.", true);
      consent.focus();
      return;
    }
    submit.disabled = true;
    try {
      await client.submitFeedback({
        consent: true,
        prompt: prompt.input.value,
        response: response.input.value,
      });
      form.reset();
      report("Example saved privately and added to your review queue.");
      await refresh();
    } catch (error) {
      report(error?.message ?? "Could not submit this example.", true);
    } finally {
      submit.disabled = false;
    }
  });

  void refresh();
  return Object.freeze({
    refresh,
    destroy() {
      destroyed = true;
      container.replaceChildren();
    },
  });
}
