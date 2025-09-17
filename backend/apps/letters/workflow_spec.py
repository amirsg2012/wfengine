# apps/letters/workflow_spec.py
STATE_ORDER = [
    "ApplicantRequest",
    "CEOInstruction",
    "Form1",
    "Form2",
    "DocsCollection",
    "Form3",
    "Form4",
    "AMLForm",
    "EvaluationCommittee",
    "AppraisalFeeDeposit",
    "AppraisalNotice",
    "AppraisalOpinion",
    "AppraisalDecision",
    "Settlment",  # keep spelling as provided
]

ADVANCER_STEPS = {
    "ApplicantRequest":       [["RE_VALUATION_LEASING_LEAD"]],
    "CEOInstruction":         [["CEO_MANAGER", "CEO_OFFICE_CHIEF"]],
    "Form1":                  [["RE_ACQUISITION_REGEN_EXPERT"]],
    "Form2":                  [["RE_ACQUISITION_REGEN_EXPERT"]],
    "DocsCollection":         [["RE_ACQUISITION_REGEN_EXPERT"]],
    "Form3":                  [
                                ["LC_CONTRACTS_ASSEMBLIES_LEAD"],
                                ["RE_TECH_URBANISM_LEAD"],
                                ["RE_ACQUISITION_REGEN_LEAD"],
                                ["RE_MANAGER"],
                              ],
    "Form4":                  [
                                ["RE_VALUATION_LEASING_LEAD"],
                                ["RE_ACQUISITION_REGEN_LEAD"],
                                ["RE_MANAGER"],
                                ["CEO_MANAGER", "CEO_OFFICE_CHIEF"],
                              ],
    "AMLForm":                [["FA_ACCOUNTING_LEAD"]],
    "EvaluationCommittee":    [["RE_VALUATION_LEASING_LEAD"]],
    "AppraisalFeeDeposit":    [["RE_VALUATION_LEASING_LEAD"]],
    "AppraisalNotice":        [["RE_VALUATION_LEASING_LEAD"]],
    "AppraisalOpinion":       [["RE_VALUATION_LEASING_LEAD"]],
    "AppraisalDecision":      [["RE_VALUATION_LEASING_LEAD"]],
    "Settlment":              [["RE_ACQUISITION_REGEN_LEAD"]],
}

NEXT_STATE = {s: STATE_ORDER[i+1] for i, s in enumerate(STATE_ORDER[:-1])}
