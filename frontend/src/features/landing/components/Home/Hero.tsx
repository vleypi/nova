"use client";
export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-24 md:pt-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-nova-dark mb-6 leading-tight">
            Место для креативности и{" "}
            <span className="relative">
              <span className="relative z-10">сотрудничества</span>
              <span className="absolute bottom-2 left-0 w-full h-4 bg-nova-yellow -z-0 opacity-70"></span>
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Интерактивная онлайн-доска для совместной работы, где команды
            творят, планируют и воплощают идеи в жизнь.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <a
              href="#"
              className="bg-nova-blue text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
            >
              Начать бесплатно <i className="ml-2 fas fa-arrow-right"></i>
            </a>
            <a
              href="#"
              className="border-2 border-nova-gray text-nova-dark px-8 py-4 rounded-full font-semibold text-lg hover:border-nova-blue transition-colors"
            >
              Узнать больше
            </a>
          </div>
        </div>

        <div className="relative max-w-6xl mx-auto mt-12 px-4 z-2">
          <div className="bg-lineart-to-r from-nova-blue-light/40 via-white to-purple-50/40 rounded-3xl p-3 md:p-6 shadow-2xl border border-gray-100">
            <div className="flex flex-wrap items-center justify-between mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    aria-label="Select tool"
                    className="w-8 h-8 rounded-lg bg-nova-blue-light hover:bg-nova-blue/20 flex items-center justify-center transition-colors"
                  >
                    <i
                      className="fas fa-mouse-pointer text-nova-blue text-sm"
                      aria-hidden
                    ></i>
                  </button>
                  <button
                    type="button"
                    aria-label="Add rectangle"
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <i
                      className="fas fa-square text-gray-600 text-sm"
                      aria-hidden
                    ></i>
                  </button>
                  <button
                    type="button"
                    aria-label="Add circle"
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <i
                      className="fas fa-circle text-gray-600 text-sm"
                      aria-hidden
                    ></i>
                  </button>
                  <button
                    type="button"
                    aria-label="Add text"
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <i
                      className="fas fa-font text-gray-600 text-sm"
                      aria-hidden
                    ></i>
                  </button>
                </div>
                <div className="w-px h-6 bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    aria-label="Add sticky note"
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <i
                      className="fas fa-sticky-note text-nova-yellow text-sm"
                      aria-hidden
                    ></i>
                  </button>
                  <button
                    type="button"
                    aria-label="Add link"
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <i
                      className="fas fa-link text-nova-blue text-sm"
                      aria-hidden
                    ></i>
                  </button>
                  <button
                    type="button"
                    aria-label="Add image"
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <i
                      className="fas fa-image text-nova-green text-sm"
                      aria-hidden
                    ></i>
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-2 md:mt-0">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-nova-blue border-2 border-white"></div>
                  <div className="w-6 h-6 rounded-full bg-nova-green border-2 border-white -ml-2"></div>
                  <div className="w-6 h-6 rounded-full bg-nova-yellow border-2 border-white -ml-2"></div>
                  <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white -ml-2 flex items-center justify-center text-xs"></div>
                </div>
                <button
                  type="button"
                  className="px-4 py-1.5 bg-nova-blue text-white text-sm font-medium rounded-full hover:bg-blue-600 transition-colors"
                >
                  Поделиться
                </button>
              </div>
            </div>

            <div className="bg-linear-to-br from-blue-50 via-white to-purple-50 rounded-2xl shadow-inner border border-gray-200 overflow-hidden relative min-h-[400px] md:min-h-[500px]">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #b3b3b3 1px, transparent 1px), linear-gradient(to bottom, #b3b3b3 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              ></div>

              <div className="absolute top-12 left-10 md:left-16 w-48 md:w-56 bg-white rounded-xl shadow-lg border border-gray-300 transform rotate-1 hover:rotate-0 transition-transform duration-300">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-nova-blue mr-2"></div>
                      <div className="w-24 h-2 bg-gray-300 rounded"></div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-nova-yellow/20 flex items-center justify-center">
                      <i className="fas fa-lightbulb text-nova-yellow text-xs"></i>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="w-full h-2 bg-gray-200 rounded"></div>
                    <div className="w-4/5 h-2 bg-gray-200 rounded"></div>
                    <div className="w-3/5 h-2 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex space-x-1">
                      <div className="w-6 h-6 rounded-full bg-nova-blue border border-white"></div>
                      <div className="w-6 h-6 rounded-full bg-nova-green border border-white -ml-2"></div>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center">
                      <i className="far fa-comment mr-1"></i>
                      <span>3</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute top-72 left-10 md:left-16 w-52 md:w-56 bg-white rounded-xl shadow-lg border border-gray-300 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-nova-purple mr-2"></div>
                      <div className="w-28 h-2 bg-gray-300 rounded"></div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-nova-yellow/20 flex items-center justify-center">
                      <i className="fas fa-tasks text-nova-yellow text-xs"></i>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="w-full h-2 bg-gray-200 rounded"></div>
                    <div className="w-3/4 h-2 bg-gray-200 rounded"></div>
                    <div className="w-2/4 h-2 bg-gray-200 rounded"></div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex space-x-1">
                      <div className="w-6 h-6 rounded-full bg-nova-blue border border-white"></div>
                      <div className="w-6 h-6 rounded-full bg-nova-green border border-white -ml-2"></div>
                      <div className="w-6 h-6 rounded-full bg-nova-pink border border-white -ml-2"></div>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center">
                      <i className="far fa-comment mr-1"></i>
                      <span>2</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-52 md:w-60 bg-white rounded-xl shadow-lg border border-gray-300 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-nova-blue-light flex items-center justify-center mr-2">
                        <i className="fas fa-chart-pie text-nova-blue text-sm"></i>
                      </div>
                      <div>
                        <div className="w-20 h-2 bg-gray-300 rounded mb-1"></div>
                        <div className="w-16 h-1.5 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="w-10 h-6 bg-nova-green/20 rounded flex items-center justify-center">
                      <div className="w-8 h-1.5 bg-gray-300 rounded"></div>
                    </div>
                  </div>

                  <div className="relative w-40 h-40 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-8 border-gray-100"></div>

                    <div
                      className="absolute inset-0 rounded-full border-8 border-transparent"
                      style={{
                        borderTopColor: "#4262FF",
                        borderRightColor: "#9D6CFF",
                        borderBottomColor: "#7FD6C2",
                        borderLeftColor: "#FFD233",
                        clipPath:
                          "polygon(50% 50%, 100% 0%, 100% 100%, 0% 100%, 0% 50%)",
                      }}
                    ></div>

                    <div className="absolute inset-8 rounded-full bg-white flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-3 bg-gray-300 rounded mx-auto mb-1"></div>
                        <div className="w-16 h-2 bg-gray-200 rounded mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute top-24 right-10 md:right-16 w-48 md:w-56 bg-white rounded-xl shadow-lg border border-gray-300 transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-nova-pink mr-2"></div>
                      <div className="w-16 h-2 bg-gray-300 rounded"></div>
                    </div>
                    <div className="w-8 h-6 bg-gray-100 rounded flex items-center justify-center">
                      <div className="w-5 h-1.5 bg-gray-400 rounded"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {[...Array(7)].map((_, i) => (
                      <div
                        key={i}
                        className="h-4 flex items-center justify-center"
                      >
                        <div className="w-4 h-1 bg-gray-300 rounded"></div>
                      </div>
                    ))}
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="h-6 flex items-center justify-center"
                      >
                        <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200"></div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-nova-blue mr-2"></div>
                      <div className="flex-1">
                        <div className="w-3/4 h-2 bg-gray-300 rounded mb-1"></div>
                        <div className="w-1/2 h-1.5 bg-gray-200 rounded"></div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-nova-yellow mr-2"></div>
                      <div className="flex-1">
                        <div className="w-2/3 h-2 bg-gray-300 rounded mb-1"></div>
                        <div className="w-2/5 h-1.5 bg-gray-200 rounded"></div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-nova-green mr-2"></div>
                      <div className="flex-1">
                        <div className="w-4/5 h-2 bg-gray-300 rounded mb-1"></div>
                        <div className="w-3/5 h-1.5 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-nova-blue border-2 border-white"></div>
                      <div className="w-6 h-6 rounded-full bg-nova-green border-2 border-white -ml-2"></div>
                      <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white -ml-2"></div>
                    </div>
                    <div className="w-20 h-6 bg-nova-blue/10 rounded-full flex items-center justify-center">
                      <div className="w-12 h-1.5 bg-nova-blue/40 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -top-6 -left-6 w-32 h-32 bg-nova-yellow/20 rounded-full -z-10 animate-pulse"></div>
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-nova-purple/20 rounded-full -z-10"></div>
          <div
            className="absolute top-1/2 -left-12 w-24 h-24 bg-nova-blue/10 rounded-full -z-10 animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>
      </div>
    </section>
  );
}
